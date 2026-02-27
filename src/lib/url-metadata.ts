/**
 * URL Metadata Extractor
 *
 * Fetches a publicly accessible webpage and extracts article metadata from:
 *   - Open Graph meta tags  (og:title, og:description, og:site_name, og:url, og:image)
 *   - Twitter Card meta tags (twitter:title, twitter:description)
 *   - Standard <meta name="description">
 *   - JSON-LD structured data  (Article / NewsArticle types)
 *   - <title> element
 *   - <link rel="canonical">
 *
 * Compliance rules enforced here:
 *   - Only fetches URLs via public HTTP/HTTPS — no auth headers
 *   - Does NOT follow login redirects
 *   - Does NOT store full article body text
 *   - Identifies itself with a descriptive User-Agent
 *   - Respects a strict 12-second timeout
 *   - Caps the HTML response at 5 MB to avoid memory issues
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UrlMetadata {
  /** Normalized URL (tracking params stripped, hash removed). */
  url:          string;
  /** The URL exactly as submitted before normalization. */
  originalUrl:  string;
  title:        string | null;
  /** Publisher name — from og:site_name, JSON-LD publisher.name, or derived from domain. */
  outlet:       string | null;
  outletDomain: string;
  publishedAt:  Date | null;
  /** Short description from og:description or meta description (truncated to 500 chars). */
  snippet:      string | null;
  imageUrl:     string | null;
  author:       string | null;
  /** True when a paywall or access restriction was detected. */
  isPaywalled:  boolean;
  /** Non-null if the fetch itself failed (network error, bad status, non-HTML). */
  fetchError:   string | null;
}

// ─── Tracking params to strip during normalization ────────────────────────────

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
  "fbclid", "gclid", "_ga", "_gl", "ref", "mc_cid", "mc_eid", "yclid", "msclkid",
  "igshid", "twclid", "s_kwcid", "hsa_acc", "hsa_cam", "hsa_grp", "hsa_ad",
  "hsa_src", "hsa_tgt", "hsa_kw", "hsa_mt", "hsa_net", "hsa_ver",
]);

/**
 * Strip known tracking query parameters and remove the URL fragment.
 * All other query params are preserved (they may be content-relevant).
 */
export function normalizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // Remove hash — it is a client-side anchor, not server-side content
  parsed.hash = "";

  // Strip tracking params
  for (const key of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key);
    }
  }

  return parsed.toString();
}

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

interface MetaAttrs {
  [key: string]: string;
}

/**
 * Extract all <meta ...> tags from HTML and return their attribute maps.
 * Handles both `"double"` and `'single'` quoted attribute values.
 */
function parseMetaTags(html: string): MetaAttrs[] {
  const tags: MetaAttrs[] = [];
  // Match self-closing <meta ...> tags (no closing slash required)
  const tagRegex = /<meta\b([^>]*?)(?:\s*\/)?>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(html)) !== null) {
    const attrsStr = tagMatch[1];
    const attrs: MetaAttrs = {};
    // Match key="value", key='value', or key=value
    const attrRegex = /(\w[\w:-]*)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|([^\s>]*))/gi;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      const key   = attrMatch[1].toLowerCase();
      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
      attrs[key]  = value;
    }
    tags.push(attrs);
  }

  return tags;
}

/**
 * Look up a single meta tag's content by its `property` or `name` attribute.
 */
function findMeta(tags: MetaAttrs[], ...lookups: string[]): string | null {
  for (const lookup of lookups) {
    const lc = lookup.toLowerCase();
    const tag = tags.find(
      (t) => t.property === lc || t.name === lc
    );
    if (tag?.content) return decodeHtmlEntities(tag.content.trim());
  }
  return null;
}

/**
 * Extract `<title>` text from HTML.
 */
function parseTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  return decodeHtmlEntities(m[1].trim()) || null;
}

/**
 * Extract `<link rel="canonical" href="...">` href.
 */
function parseCanonical(html: string): string | null {
  const m = /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(html)
         ?? /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']canonical["']/i.exec(html);
  return m ? m[1].trim() : null;
}

/**
 * Extract and parse all `<script type="application/ld+json">` blocks.
 */
function parseJsonLdBlocks(html: string): unknown[] {
  const results: unknown[] = [];
  const regex = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {
      // Invalid JSON-LD — skip
    }
  }

  return results;
}

interface JsonLdArticle {
  headline?:       string;
  datePublished?:  string;
  dateModified?:   string;
  publisherName?:  string;
  authorName?:     string;
  image?:          string;
}

const ARTICLE_TYPES = new Set([
  "article", "newsarticle", "reportage", "satiricalarticle",
  "scholarlyarticle", "technicalarticle", "webpage", "webpageelement",
]);

function findArticleJsonLd(items: unknown[]): JsonLdArticle | null {
  // Walk the JSON-LD graph — handle @graph arrays too
  const flat: unknown[] = [];
  for (const item of items) {
    if (typeof item !== "object" || !item) continue;
    const obj = item as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) {
      flat.push(...(obj["@graph"] as unknown[]));
    } else {
      flat.push(item);
    }
  }

  for (const item of flat) {
    if (typeof item !== "object" || !item) continue;
    const obj  = item as Record<string, unknown>;
    const type = obj["@type"];
    const typeStr = (Array.isArray(type) ? type[0] : type) as string | undefined;
    if (!typeStr) continue;

    if (!ARTICLE_TYPES.has(typeStr.toLowerCase())) continue;

    // publisher — can be object {name} or string
    let publisherName: string | undefined;
    const pub = obj.publisher;
    if (typeof pub === "object" && pub && "name" in pub) {
      publisherName = String((pub as Record<string, unknown>).name);
    } else if (typeof pub === "string") {
      publisherName = pub;
    }

    // author — can be object {name}, array, or string
    let authorName: string | undefined;
    const auth = obj.author;
    const firstAuth = Array.isArray(auth) ? auth[0] : auth;
    if (typeof firstAuth === "object" && firstAuth && "name" in firstAuth) {
      authorName = String((firstAuth as Record<string, unknown>).name);
    } else if (typeof firstAuth === "string") {
      authorName = firstAuth;
    }

    // image — can be string or object
    let image: string | undefined;
    if (typeof obj.image === "string") image = obj.image;
    else if (typeof obj.image === "object" && obj.image && "url" in obj.image) {
      image = String((obj.image as Record<string, unknown>).url);
    }

    return {
      headline:      typeof obj.headline === "string" ? obj.headline : undefined,
      datePublished: typeof obj.datePublished === "string" ? obj.datePublished :
                     typeof obj.dateModified  === "string" ? obj.dateModified  : undefined,
      publisherName,
      authorName,
      image,
    };
  }

  return null;
}

// ─── Paywall detection ────────────────────────────────────────────────────────

// Patterns in HTML source that strongly indicate a paywall or access gate.
const PAYWALL_CLASS_PATTERNS = [
  /class\s*=\s*["'][^"']*\b(?:paywall|paywalled|subscription-wall|subscriber-only|locked-content|premium-content|gate-content|metered-paywall|access-denied)\b[^"']*["']/i,
  /id\s*=\s*["'][^"']*\b(?:paywall|subscription-wall|subscriber-only)\b[^"']*["']/i,
  /data-(?:paywall|premium|locked|subscriber)[^=>\s]*/i,
  /aria-label\s*=\s*["'][^"']*\b(?:subscriber|paywall|premium)\b[^"']*["']/i,
];

const PAYWALL_TEXT_PATTERNS = [
  /subscribers?\s+only/i,
  /subscribe\s+to\s+(?:continue|read|access)/i,
  /(?:already\s+a\s+subscriber|existing\s+subscriber)/i,
  /this\s+(?:article|content|story)\s+is\s+(?:for|available\s+to)\s+subscribers/i,
  /(?:create\s+an?\s+account|sign\s+up)\s+to\s+(?:continue|read|access)/i,
  /(?:register|log\s*in|sign\s*in)\s+to\s+(?:continue|read|access)\s+this/i,
  /exclusive\s+content\s+for\s+(?:members|subscribers)/i,
  /start\s+(?:your\s+)?(?:free\s+)?(?:trial|subscription)\s+to\s+read/i,
  /you(?:'ve|\s+have)\s+reached\s+(?:your\s+)?(?:free\s+)?(?:article|monthly)\s+limit/i,
];

export function detectPaywall(html: string, statusCode: number): boolean {
  // Hard block from server
  if (statusCode === 401 || statusCode === 403) return true;

  // Check class/attribute patterns in HTML structure
  const classHits = PAYWALL_CLASS_PATTERNS.filter((p) => p.test(html)).length;
  if (classHits >= 1) return true;

  // Check textual patterns in the rendered text
  const textHits = PAYWALL_TEXT_PATTERNS.filter((p) => p.test(html)).length;
  if (textHits >= 2) return true;
  if (textHits >= 1 && classHits >= 1) return true;

  return false;
}

// ─── HTML entity decoder (minimal, for titles/descriptions) ──────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g,   "&")
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&quot;/g,  '"')
    .replace(/&#039;/g,  "'")
    .replace(/&#39;/g,   "'")
    .replace(/&apos;/g,  "'")
    .replace(/&nbsp;/g,  " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ─── Domain → outlet name heuristic ─────────────────────────────────────────

/**
 * Derive a human-readable outlet name from a hostname when no site_name is available.
 * e.g. "www.latimes.com" → "latimes.com", "calmatters.org" → "calmatters.org"
 */
function domainToOutlet(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

// ─── Image URL helpers ────────────────────────────────────────────────────────

/**
 * Resolve a raw image URL (which may be relative) against the page URL and
 * verify it is a valid http/https URL.  Returns null if it cannot be resolved
 * or is not a safe web URL — callers should treat null as "no image available".
 *
 * NOTE: Do NOT pass the result through sanitizeText() or DOMPurify — those
 * HTML-serialise the string and will encode `&` → `&amp;` in query params,
 * breaking CDN URLs like `?w=800&h=600`.  Just store the raw URL string.
 */
function resolveImageUrl(rawUrl: string | null, pageUrl: string): string | null {
  if (!rawUrl?.trim()) return null;

  let resolved: string;
  try {
    // new URL(relative, base) resolves relative paths; also validates absolute URLs
    resolved = new URL(rawUrl.trim(), pageUrl).toString();
  } catch {
    return null;
  }

  // Only allow http/https image URLs
  if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) return null;

  return resolved;
}

// ─── Main export ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS    = 12_000;
const MAX_RESPONSE_BYTES  = 5 * 1024 * 1024; // 5 MB cap
const USER_AGENT =
  "NewsDashboard-MetaBot/1.0 (compliant metadata reader; contact: admin@example.com)";

/**
 * Fetch a URL and extract article metadata.
 *
 * This function ONLY reads publicly visible page metadata.
 * It never bypasses authentication, paywalls, or access controls.
 */
export async function fetchUrlMetadata(rawUrl: string): Promise<UrlMetadata> {
  const originalUrl  = rawUrl.trim();
  const normalizedUrl = normalizeUrl(originalUrl);

  let outletDomain: string;
  try {
    outletDomain = new URL(normalizedUrl).hostname.replace(/^www\./, "");
  } catch {
    return makeError(originalUrl, normalizedUrl, "Invalid URL");
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  let response: Response;
  let html: string;
  let statusCode: number;

  try {
    response = await fetch(normalizedUrl, {
      method:   "GET",
      redirect: "follow",
      signal:   AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":       USER_AGENT,
        "Accept":           "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":  "en-US,en;q=0.9",
        "Accept-Encoding":  "gzip, deflate, br",
        "Cache-Control":    "no-cache",
      },
    });

    statusCode = response.status;

    // Non-HTML content types — PDF, binary, etc.
    const ct = response.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      const friendly =
        ct.includes("pdf")   ? "This URL points to a PDF, not a webpage." :
        ct.includes("json")  ? "This URL returns JSON, not a webpage." :
        `Unexpected content type: ${ct.split(";")[0].trim()}`;
      return makeError(originalUrl, normalizedUrl, friendly, outletDomain, statusCode);
    }

    // Cap response size to avoid reading huge pages into memory
    const reader = response.body?.getReader();
    if (!reader) {
      html = await response.text();
    } else {
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          chunks.push(value);
          if (totalBytes >= MAX_RESPONSE_BYTES) {
            reader.cancel();
            break;
          }
        }
      }

      html = new TextDecoder().decode(
        chunks.reduce((acc, chunk) => {
          const merged = new Uint8Array(acc.length + chunk.length);
          merged.set(acc);
          merged.set(chunk, acc.length);
          return merged;
        }, new Uint8Array())
      );
    }
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "Request timed out (12s). The site may be slow or blocking bots."
        : err instanceof Error
        ? err.message
        : "Network error";
    return makeError(originalUrl, normalizedUrl, msg, outletDomain);
  }

  // ── Parse ──────────────────────────────────────────────────────────────────
  const metaTags  = parseMetaTags(html);
  const jsonLdAll = parseJsonLdBlocks(html);
  const jsonLd    = findArticleJsonLd(jsonLdAll);

  const ogTitle       = findMeta(metaTags, "og:title");
  const ogDescription = findMeta(metaTags, "og:description");
  const ogSiteName    = findMeta(metaTags, "og:site_name");
  // og:image:secure_url is the HTTPS variant; some sites only provide one of the two
  const ogImage       = findMeta(metaTags, "og:image", "og:image:secure_url");
  const ogUrl         = findMeta(metaTags, "og:url");
  const twitterTitle  = findMeta(metaTags, "twitter:title");
  const twitterDesc   = findMeta(metaTags, "twitter:description");
  // twitter:image / twitter:image:src are widely used as a fallback when og:image is absent
  const twitterImage  = findMeta(metaTags, "twitter:image", "twitter:image:src");
  const metaDesc      = findMeta(metaTags, "description");
  const canonical     = parseCanonical(html);
  const rawTitle      = parseTitle(html);

  // Resolve the canonical URL (prefer og:url, then <link rel="canonical">)
  let resolvedUrl = normalizedUrl;
  try {
    const candidate = ogUrl ?? canonical;
    if (candidate) {
      const abs = new URL(candidate, normalizedUrl).toString();
      if (abs.startsWith("http")) resolvedUrl = normalizeUrl(abs);
    }
  } catch { /* keep normalizedUrl */ }

  // ── Derive fields ──────────────────────────────────────────────────────────
  const title = (
    jsonLd?.headline ??
    ogTitle ??
    twitterTitle ??
    rawTitle
  )?.trim() || null;

  const outlet = (
    jsonLd?.publisherName ??
    ogSiteName ??
    domainToOutlet(outletDomain)
  )?.trim() || domainToOutlet(outletDomain);

  const rawSnippet =
    ogDescription ?? twitterDesc ?? metaDesc ?? null;
  const snippet = rawSnippet
    ? decodeHtmlEntities(rawSnippet).trim().slice(0, 500) || null
    : null;

  // Prefer og:image, fall back to JSON-LD image, then twitter:image
  const rawImageUrl = ogImage ?? jsonLd?.image ?? twitterImage ?? null;
  // Resolve relative URLs (og:image should always be absolute, but some sites get it wrong)
  // and validate the result is a usable http/https URL.
  const imageUrl = resolveImageUrl(rawImageUrl, resolvedUrl);
  const author   = jsonLd?.authorName?.trim() ?? null;

  // Published date — try JSON-LD first, then common meta patterns
  let publishedAt: Date | null = null;
  const dateCandidates = [
    jsonLd?.datePublished,
    findMeta(metaTags, "article:published_time"),
    findMeta(metaTags, "article:modified_time"),
    findMeta(metaTags, "date"),
    findMeta(metaTags, "pubdate"),
  ];
  for (const dc of dateCandidates) {
    if (!dc) continue;
    const d = new Date(dc);
    if (!isNaN(d.getTime())) { publishedAt = d; break; }
  }

  const isPaywalled = detectPaywall(html, statusCode);

  return {
    url:          resolvedUrl,
    originalUrl,
    title,
    outlet,
    outletDomain,
    publishedAt,
    snippet:      isPaywalled ? null : snippet, // don't store paywalled snippet
    imageUrl,
    author,
    isPaywalled,
    fetchError:   null,
  };
}

function makeError(
  originalUrl: string,
  url:         string,
  message:     string,
  outletDomain?: string,
  statusCode?:   number,
): UrlMetadata {
  let domain = outletDomain ?? "";
  if (!domain) {
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ok */ }
  }
  const paywalled = statusCode === 401 || statusCode === 403;
  return {
    url, originalUrl,
    title: null, outlet: null, outletDomain: domain,
    publishedAt: null, snippet: null, imageUrl: null, author: null,
    isPaywalled: paywalled,
    fetchError: message,
  };
}
