/**
 * POST /api/admin/articles/refresh-images
 *
 * Scans all articles that have no imageUrl and attempts to fetch an
 * Open Graph / Twitter Card image from each article's stored URL.
 *
 * Compliance:
 *   - Requires admin authentication
 *   - Uses the same fetchUrlMetadata() path as manual URL ingestion
 *     (public metadata only, no paywall bypass)
 *   - A small inter-request delay is inserted to be polite to origins
 *   - Capped at MAX_ARTICLES per call to fit within serverless limits
 *
 * Responses:
 *   200  — Completed successfully, returns { total, updated, failed }
 *   401  — Not authenticated
 *   500  — Unexpected server error
 */

import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import prisma               from "@/lib/prisma";
import { authOptions }      from "@/lib/auth";
import { fetchUrlMetadata } from "@/lib/url-metadata";

// ─── Config ──────────────────────────────────────────────────────────────────

/** Maximum articles processed in a single call (keeps request within time limits). */
const MAX_ARTICLES    = 100;

/** Milliseconds to wait between HTTP fetches — avoids hammering individual origins. */
const INTER_REQ_DELAY = 250;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST() {
  // 1. Require admin session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Find articles with no image, most recently created first
  const articles = await prisma.article.findMany({
    where:   { imageUrl: null },
    select:  { id: true, url: true },
    orderBy: { createdAt: "desc" },
    take:    MAX_ARTICLES,
  });

  const total = articles.length;
  let updated = 0;
  let failed  = 0;

  // 3. Attempt to fetch an image for each article
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    // Polite delay between outbound requests (skip before the first one)
    if (i > 0) await delay(INTER_REQ_DELAY);

    try {
      const meta = await fetchUrlMetadata(article.url);

      if (meta.imageUrl) {
        await prisma.article.update({
          where: { id: article.id },
          data:  { imageUrl: meta.imageUrl },
        });
        updated++;
      } else {
        // Page fetched but no image found (not a hard error)
        failed++;
      }
    } catch {
      // Network error, timeout, etc.
      failed++;
    }
  }

  // 4. Return counts
  return NextResponse.json({ total, updated, failed });
}
