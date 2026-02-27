/**
 * POST /api/admin/articles/fetch-from-url
 *
 * Fetches public metadata from a URL and creates an Article record.
 *
 * Compliance:
 *   - Requires admin authentication
 *   - Only fetches publicly accessible metadata (OG tags, JSON-LD, meta tags)
 *   - Never bypasses paywalls or authentication
 *   - Rate limited per admin user: 30 requests / hour
 *
 * Request body:
 *   { url: string }
 *
 * Responses:
 *   201  — Article created, returns full Article object
 *   400  — Invalid/non-HTTP(S) URL
 *   401  — Not authenticated
 *   409  — URL already exists (returns existing article id)
 *   422  — Fetch succeeded but returned unusable content
 *   429  — Rate limit exceeded
 *   500  — Unexpected server error
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { z }                         from "zod";
import prisma                        from "@/lib/prisma";
import { authOptions }               from "@/lib/auth";
import { writeAuditLog }             from "@/lib/audit";
import { rateLimit }                 from "@/lib/rate-limit";
import { sanitizeText, sanitizeAndTruncate } from "@/lib/sanitize";
import { fetchUrlMetadata, normalizeUrl } from "@/lib/url-metadata";
import { parseJsonArray }            from "@/lib/utils";
import type { Article }              from "@/types";

// ─── Vercel serverless config ─────────────────────────────────────────────────
// Allow up to 60s on Pro / 10s on Hobby (Vercel caps to plan maximum)
export const maxDuration = 60;

// ─── Input schema ─────────────────────────────────────────────────────────────

const bodySchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .trim()
    .min(1, "URL cannot be empty")
    .refine(
      (v) => {
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid http or https URL" }
    ),
});

// ─── Rate limit: 30 URL fetches per hour per admin ───────────────────────────
const RATE_LIMIT      = 30;
const RATE_WINDOW_MS  = 60 * 60 * 1000;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorEmail = session.user.email;

    // 2. Rate limit (key = "url-fetch:<email>")
    const rl = rateLimit(`url-fetch:${actorEmail}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.success) {
      return NextResponse.json(
        {
          error:   "Rate limit exceeded. You can fetch up to 30 URLs per hour.",
          resetAt: rl.resetAt,
        },
        {
          status:  429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    // 3. Parse + validate body
    let body: unknown;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { url: rawUrl } = parsed.data;

    // 4. Normalize URL and check for duplicates
    const normalizedUrl = normalizeUrl(rawUrl);

    const existing = await prisma.article.findFirst({
      where: { url: { in: [rawUrl, normalizedUrl] } },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:      "This URL is already in the system.",
          existingId: existing.id,
          article:    formatArticle(existing),
        },
        { status: 409 }
      );
    }

    // 5. Fetch metadata
    const meta = await fetchUrlMetadata(normalizedUrl);

    // If there was a hard fetch error AND we got no title at all, return 422
    if (meta.fetchError && !meta.title) {
      return NextResponse.json({ error: meta.fetchError }, { status: 422 });
    }

    // 6. Determine status
    //    - NEEDS_MANUAL: paywalled/blocked, or fetch failed but we have a URL (admin can fill in)
    //    - QUEUED: we got at least a title
    const status: "QUEUED" | "NEEDS_MANUAL" =
      meta.isPaywalled || (meta.fetchError !== null && !meta.title)
        ? "NEEDS_MANUAL"
        : "QUEUED";

    // 7. Keywords (no longer auto-matched)
    const kwMatches: string[] = [];

    // 8. Derive outlet from domain if not found
    const outlet       = sanitizeText(meta.outlet ?? meta.outletDomain);
    const outletDomain = sanitizeText(meta.outletDomain || new URL(normalizedUrl).hostname.replace(/^www\./, ""));
    const title        = sanitizeText(meta.title ?? `Article from ${outletDomain}`);
    const snippet      = meta.snippet ? sanitizeAndTruncate(meta.snippet, 500) : null;

    // 9. Published date — fall back to now if not found (admin can correct)
    const publishedAt  = meta.publishedAt ?? new Date();

    // 10. Create Article
    const article = await prisma.article.create({
      data: {
        title,
        outlet,
        outletDomain,
        url:             normalizedUrl,
        publishedAt,
        snippet,
        manualSummary:   null,
        keywordsMatched: JSON.stringify(kwMatches),
        tags:            "[]",
        priority:        false,
        status,
        ingestSource:    "URL",
        imageUrl:        meta.imageUrl ?? null,
        author:          meta.author   ? sanitizeText(meta.author)   : null,
      },
    });

    // 11. Audit log
    await writeAuditLog({
      articleId:  article.id,
      action:     "URL_INGESTED",
      actorEmail,
      details: {
        url:          normalizedUrl,
        status,
        isPaywalled:  meta.isPaywalled,
        fetchError:   meta.fetchError,
        kwMatches,
      },
    });

    return NextResponse.json(formatArticle(article), { status: 201 });
  } catch (err) {
    console.error("[fetch-from-url] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Formatter (matches shape expected by queue UI) ───────────────────────────

type PrismaArticleRow = {
  id: string; title: string; outlet: string; outletDomain: string;
  publishedAt: Date; url: string; keywordsMatched: string;
  snippet: string | null; manualSummary: string | null; status: string;
  priority: boolean; tags: string; ingestSource: string;
  imageUrl: string | null; author: string | null; section: string | null;
  createdAt: Date; updatedAt: Date;
};

function formatArticle(a: PrismaArticleRow): Article {
  return {
    ...a,
    publishedAt:     a.publishedAt.toISOString(),
    createdAt:       a.createdAt.toISOString(),
    updatedAt:       a.updatedAt.toISOString(),
    keywordsMatched: parseJsonArray(a.keywordsMatched),
    tags:            parseJsonArray(a.tags),
    status:          a.status      as Article["status"],
    ingestSource:    a.ingestSource as Article["ingestSource"],
    section:         (a.section ?? null) as Article["section"],
  };
}
