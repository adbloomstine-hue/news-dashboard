/**
 * News API Ingestion Adapter (Adapter B)
 *
 * Supports two providers via env vars:
 *   NEWS_API_PROVIDER=newsapi    → newsapi.org  (default)
 *   NEWS_API_PROVIDER=newsdata   → newsdata.io
 *
 * Set NEWS_API_KEY in your .env to enable this adapter.
 * Leave NEWS_API_KEY empty to disable (no error thrown, just returns empty).
 *
 * Query strategy:
 *   Keywords are joined as quoted-phrase OR queries ("keyword A" OR "keyword B").
 *   As many keywords as fit within the API's query-length budget are included.
 *   After fetching, results are locally re-filtered so only articles that truly
 *   contain at least one keyword in their title/snippet are kept.
 *
 * Only metadata is stored — never follows links to scrape full content.
 */

import { matchKeywords } from "../keywords";
import { sanitizeText, sanitizeAndTruncate } from "@/lib/sanitize";
import type { RawArticle } from "@/types";

export interface NewsApiOptions {
  /** Keywords to match against (loaded from DB by caller) */
  keywords: string[];
  /** Only return articles published on or after this date */
  from?: Date;
  /** Only return articles published on or before this date */
  to?: Date;
}

export interface NewsApiAdapterResult {
  articles:   RawArticle[];
  /** Articles returned by the API before local keyword re-filtering */
  rawFetched: number;
  error?:     string;
}

// Read at call-time via getters so a dev-server restart isn't needed
// when the key is added/changed in .env after the module was first imported.
function getApiKey():      string { return process.env.NEWS_API_KEY      ?? ""; }
function getApiProvider(): string { return (process.env.NEWS_API_PROVIDER ?? "newsapi").toLowerCase(); }

// ─── Query builder ────────────────────────────────────────────────────────────

/**
 * Build an OR query from keywords, fitting within `budgetChars`.
 * Each keyword is wrapped in quotes for exact-phrase matching.
 * Returns the query string and the number of keywords included.
 */
function buildOrQuery(keywords: string[], budgetChars = 490): { query: string; included: number } {
  const parts: string[] = [];
  let used = 0;

  for (const kw of keywords) {
    const part = `"${kw}"`;
    const sep  = parts.length > 0 ? " OR " : "";
    if (used + sep.length + part.length > budgetChars) break;
    parts.push(part);
    used += sep.length + part.length;
  }

  return { query: parts.join(" OR "), included: parts.length };
}

// ─── newsapi.org ──────────────────────────────────────────────────────────────

interface NewsApiArticle {
  title:       string;
  url:         string;
  description: string | null;
  publishedAt: string;
  source:      { id: string | null; name: string };
  urlToImage:  string | null;
  author:      string | null;
  content:     string | null;
}

interface NewsApiResponse {
  status:       string;
  totalResults: number;
  articles:     NewsApiArticle[];
  message?:     string; // present on error responses
  code?:        string;
}

async function fetchFromNewsApi(
  options: NewsApiOptions
): Promise<{ articles: RawArticle[]; rawFetched: number }> {
  const { query, included } = buildOrQuery(options.keywords);
  if (!query) return { articles: [], rawFetched: 0 };

  const params = new URLSearchParams({
    q:        query,
    language: "en",
    sortBy:   "publishedAt",
    pageSize: "100",
    apiKey:   getApiKey(),
  });

  // newsapi.org accepts full ISO 8601 timestamps for from/to
  if (options.from) params.set("from", options.from.toISOString());
  if (options.to)   params.set("to",   options.to.toISOString());

  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    headers: { "User-Agent": "NewsDashboard/1.0" },
    signal: AbortSignal.timeout(20000),
  });

  const body = await res.text();
  let data: NewsApiResponse;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`newsapi.org HTTP ${res.status}: non-JSON response`);
  }

  if (!res.ok || data.status !== "ok") {
    const detail = data.message ?? `HTTP ${res.status}`;
    const code   = data.code ? ` [${data.code}]` : "";
    throw new Error(`newsapi.org${code}: ${detail}`);
  }

  const raw = data.articles ?? [];
  const rawFetched = raw.length;

  // The API's OR query is intentionally broad to maximise recall. We re-filter
  // locally so only articles that genuinely mention a keyword in their title or
  // description are kept — this drops off-topic false positives (e.g. articles
  // where the API matched a keyword only in an unrelated internal caption).
  //
  // Note: newsapi truncates `content` to ~200 chars. If a keyword appears only
  // deep in the article body it may still be dropped here. In practice our
  // California-specific phrases ("California cardroom", "Kyle Kirkland", etc.)
  // almost always appear in the headline or opening sentences.
  const results: RawArticle[] = [];
  for (const a of raw) {
    if (!a.title || !a.url || a.title === "[Removed]") continue;

    const title   = sanitizeText(a.title);
    const snippet = sanitizeAndTruncate(a.description ?? a.content ?? "", 500);
    if (!title) continue;

    // Date-range guard (API honours it, but double-check for safety)
    const publishedAt = new Date(a.publishedAt);
    if (isNaN(publishedAt.getTime())) continue;
    if (options.from && publishedAt < options.from) continue;
    if (options.to   && publishedAt > options.to)   continue;

    // Keyword quality gate — ensures article is genuinely on-topic
    if (!matchKeywords(`${title} ${snippet}`, options.keywords).length) continue;

    let domain: string;
    try { domain = new URL(a.url).hostname.replace(/^www\./, ""); }
    catch { continue; }

    results.push({
      title,
      url:          a.url,
      outlet:       sanitizeText(a.source.name) || domain,
      outletDomain: domain,
      publishedAt,
      snippet:      snippet || undefined,
      imageUrl:     a.urlToImage ?? undefined,
      author:       a.author ? sanitizeText(a.author) : undefined,
      source:       "NEWS_API",
    });
  }

  if (included < options.keywords.length) {
    console.info(
      `[newsapi] Query included ${included}/${options.keywords.length} keywords (query budget limit).`
    );
  }

  return { articles: results, rawFetched };
}

// ─── newsdata.io ──────────────────────────────────────────────────────────────

interface NewsdataArticle {
  title:       string;
  link:        string;
  description: string | null;
  pubDate:     string;
  source_id:   string;
  source_url:  string | null;
  image_url:   string | null;
  creator:     string[] | null;
  content:     string | null;
}

interface NewsdataResponse {
  status:      string;
  totalResults: number;
  results:     NewsdataArticle[];
  message?:    string;
}

async function fetchFromNewsdata(
  options: NewsApiOptions
): Promise<{ articles: RawArticle[]; rawFetched: number }> {
  // newsdata.io uses a simpler query syntax; 512-char limit
  const { query } = buildOrQuery(options.keywords, 500);
  if (!query) return { articles: [], rawFetched: 0 };

  const params = new URLSearchParams({
    q:        query,
    language: "en",
    apikey:   getApiKey(),
  });

  // newsdata.io uses from_date / to_date (YYYY-MM-DD)
  if (options.from) params.set("from_date", options.from.toISOString().slice(0, 10));
  if (options.to)   params.set("to_date",   options.to.toISOString().slice(0, 10));

  const res = await fetch(`https://newsdata.io/api/1/news?${params}`, {
    headers: { "User-Agent": "NewsDashboard/1.0" },
    signal: AbortSignal.timeout(20000),
  });

  const body = await res.text();
  let data: NewsdataResponse;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`newsdata.io HTTP ${res.status}: non-JSON response`);
  }

  if (!res.ok || data.status !== "success") {
    throw new Error(`newsdata.io: ${data.message ?? `HTTP ${res.status}`}`);
  }

  const raw = data.results ?? [];
  const rawFetched = raw.length;

  const results: RawArticle[] = [];
  for (const a of raw) {
    if (!a.title || !a.link) continue;

    const title   = sanitizeText(a.title);
    const snippet = sanitizeAndTruncate(a.description ?? a.content ?? "", 500);
    if (!title) continue;

    const publishedAt = new Date(a.pubDate);
    if (isNaN(publishedAt.getTime())) continue;
    if (options.from && publishedAt < options.from) continue;
    if (options.to   && publishedAt > options.to)   continue;

    if (!matchKeywords(`${title} ${snippet}`, options.keywords).length) continue;

    let domain: string;
    try { domain = new URL(a.link).hostname.replace(/^www\./, ""); }
    catch { domain = a.source_url?.replace(/^www\./, "") ?? a.source_id; }

    results.push({
      title,
      url:          a.link,
      outlet:       sanitizeText(a.source_id),
      outletDomain: domain,
      publishedAt,
      snippet:      snippet || undefined,
      imageUrl:     a.image_url ?? undefined,
      author:       a.creator?.[0] ? sanitizeText(a.creator[0]) : undefined,
      source:       "NEWS_API",
    });
  }

  return { articles: results, rawFetched };
}

// ─── Public adapter entry-point ───────────────────────────────────────────────

/**
 * Fetch articles from the configured News API provider.
 * Returns empty result (no error) when NEWS_API_KEY is not set.
 */
export async function fetchFromNewsApi_Adapter(
  options: NewsApiOptions
): Promise<NewsApiAdapterResult> {
  if (!getApiKey()) {
    return { articles: [], rawFetched: 0 }; // Adapter disabled — not an error
  }

  try {
    const result =
      getApiProvider() === "newsdata"
        ? await fetchFromNewsdata(options)
        : await fetchFromNewsApi(options);

    return { articles: result.articles, rawFetched: result.rawFetched };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { articles: [], rawFetched: 0, error: message };
  }
}
