/**
 * Ingestion Orchestrator
 *
 * Coordinates all ingestion adapters and persists results to the database.
 * Called by:
 *   - /api/cron (Vercel Cron or external scheduler)
 *   - /api/ingest (manual trigger from admin)
 *   - CLI: npm run ingest
 */

import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { writeAuditLog } from "@/lib/audit";
import { getTrackedKeywords, matchKeywords } from "./keywords";
import { fetchRssFeed, loadFeedConfigs } from "./adapters/rss";
import { fetchFromNewsApi_Adapter } from "./adapters/newsapi";
import type { RawArticle, IngestionResult } from "@/types";

export interface IngestionOptions {
  /** Only ingest articles published on or after this date */
  from?: Date;
  /** Only ingest articles published on or before this date */
  to?: Date;
}

export interface IngestionSummary {
  results:      IngestionResult[];
  totalFound:   number;
  totalCreated: number;
  totalDuped:   number;
  /** Keyword hit counts across all newly created articles */
  keywordStats: { term: string; count: number }[];
  /** ISO string of when the run completed */
  finishedAt:   string;
}

/** Persist a batch of raw articles to the database. */
async function persistArticles(
  articles: RawArticle[],
  keywords: string[]
): Promise<{
  created:      number;
  duped:        number;
  keywordHits:  Record<string, number>;
}> {
  let created     = 0;
  let duped       = 0;
  const keywordHits: Record<string, number> = {};

  for (const article of articles) {
    try {
      const matched = matchKeywords(`${article.title} ${article.snippet ?? ""}`, keywords);

      // Upsert — skip if URL already exists (dedup by canonical URL)
      const existing = await prisma.article.findUnique({
        where: { url: article.url },
      });

      if (existing) {
        duped++;
        continue;
      }

      const created_article = await prisma.article.create({
        data: {
          title:           article.title,
          outlet:          article.outlet,
          outletDomain:    article.outletDomain,
          publishedAt:     article.publishedAt,
          url:             article.url,
          keywordsMatched: JSON.stringify(matched),
          snippet:         article.snippet ?? null,
          imageUrl:        article.imageUrl ?? null,
          author:          article.author ?? null,
          status:          "QUEUED",
          ingestSource:    article.source,
          priority:        false,
          tags:            "[]",
        },
      });

      await writeAuditLog({
        articleId:  created_article.id,
        action:     "INGESTED",
        actorEmail: "system@ingestion",
        details:    { source: article.source, url: article.url },
      });

      // Accumulate keyword hit counts
      for (const kw of matched) {
        keywordHits[kw] = (keywordHits[kw] ?? 0) + 1;
      }

      created++;
    } catch (err) {
      logger.error({ err, url: article.url }, "Failed to persist article");
    }
  }

  return { created, duped, keywordHits };
}

/** Run all enabled ingestion adapters. */
export async function runIngestion(options: IngestionOptions = {}): Promise<IngestionSummary> {
  const results: IngestionResult[] = [];
  const runStart = new Date();

  // Load keywords from DB (falls back to hardcoded defaults)
  const keywords = await getTrackedKeywords();
  logger.info({ keywordCount: keywords.length }, "Loaded keywords for ingestion");

  // Shared keyword hit accumulator across all adapters
  const allKeywordHits: Record<string, number> = {};

  // ── Adapter A: RSS ──────────────────────────────────────────────────────
  const feeds = await loadFeedConfigs();
  logger.info({ feedCount: feeds.length }, "Starting RSS ingestion");

  for (const feed of feeds) {
    const ingestRun = await prisma.ingestRun.create({
      data: { source: "RSS", feedUrl: feed.url, startedAt: runStart },
    });

    const { articles, rawFetched, error } = await fetchRssFeed(feed, {
      keywords,
      from: options.from,
      to:   options.to,
    });
    logger.info(
      { feed: feed.name, raw: rawFetched, matched: articles.length, error },
      "RSS feed fetched"
    );

    const { created, duped, keywordHits } = await persistArticles(articles, keywords);

    // Merge keyword hits
    for (const [kw, count] of Object.entries(keywordHits)) {
      allKeywordHits[kw] = (allKeywordHits[kw] ?? 0) + count;
    }

    await prisma.ingestRun.update({
      where: { id: ingestRun.id },
      data: {
        finishedAt:      new Date(),
        articlesFound:   articles.length,
        articlesCreated: created,
        articlesDuped:   duped,
        error:           error ?? null,
      },
    });

    results.push({
      source:          feed.name,
      articlesRaw:     rawFetched,
      articlesFound:   articles.length,
      articlesCreated: created,
      articlesDuped:   duped,
      errors:          error ? [error] : [],
    });
  }

  // ── Adapter B: News API ─────────────────────────────────────────────────
  const ingestRun = await prisma.ingestRun.create({
    data: { source: "NEWS_API", startedAt: runStart },
  });

  const { articles: apiArticles, rawFetched: apiRaw, error: apiError } =
    await fetchFromNewsApi_Adapter({
      keywords,
      from: options.from,
      to:   options.to,
    });

  if (process.env.NEWS_API_KEY) {
    logger.info(
      { raw: apiRaw, matched: apiArticles.length, error: apiError },
      "News API ingestion done"
    );
  }

  const { created: apiCreated, duped: apiDuped, keywordHits: apiHits } =
    await persistArticles(apiArticles, keywords);

  for (const [kw, count] of Object.entries(apiHits)) {
    allKeywordHits[kw] = (allKeywordHits[kw] ?? 0) + count;
  }

  await prisma.ingestRun.update({
    where: { id: ingestRun.id },
    data: {
      finishedAt:      new Date(),
      articlesFound:   apiArticles.length,
      articlesCreated: apiCreated,
      articlesDuped:   apiDuped,
      error:           apiError ?? null,
    },
  });

  if (process.env.NEWS_API_KEY || apiError) {
    results.push({
      source:          "News API",
      articlesRaw:     apiRaw,
      articlesFound:   apiArticles.length,
      articlesCreated: apiCreated,
      articlesDuped:   apiDuped,
      errors:          apiError ? [apiError] : [],
    });
  }

  const totalFound   = results.reduce((s, r) => s + r.articlesFound,   0);
  const totalCreated = results.reduce((s, r) => s + r.articlesCreated, 0);
  const totalDuped   = results.reduce((s, r) => s + r.articlesDuped,   0);

  // Build sorted keyword stats array
  const keywordStats = Object.entries(allKeywordHits)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);

  logger.info({ totalCreated, totalDuped }, "Ingestion complete");

  return {
    results,
    totalFound,
    totalCreated,
    totalDuped,
    keywordStats,
    finishedAt: new Date().toISOString(),
  };
}
