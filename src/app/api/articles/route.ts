/**
 * GET /api/articles — Public article list (approved only)
 * Supports: search, keyword, outlet, from, to, priority, tag, page, pageSize
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import type { Article } from "@/types";

const querySchema = z.object({
  search:    z.string().optional(),
  outlet:    z.string().optional(),
  from:      z.string().optional(),
  to:        z.string().optional(),
  priority:  z.enum(["true", "false"]).optional(),
  tag:       z.string().optional(),
  quickRange:z.enum(["today", "yesterday", "week"]).optional(),
  section:   z.enum(["cardrooms", "tribal", "gaming"]).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(req: NextRequest) {
  const params  = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed  = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { search, outlet, from, to, priority, tag, quickRange, section, page, pageSize } = parsed.data;

  // Build date range from quickRange shorthand.
  // All bounds are computed in UTC so they stay consistent with how
  // publishedAt values are stored and how groupByDate() keys articles.
  let dateFrom: Date | undefined;
  let dateTo:   Date | undefined;   // always EXCLUSIVE upper bound → use { lt: dateTo }

  // UTC midnight of today
  const utcToday = new Date();
  utcToday.setUTCHours(0, 0, 0, 0);

  if (quickRange === "today") {
    dateFrom = new Date(utcToday);                          // today   00:00 UTC
    dateTo   = new Date(utcToday.getTime() + 86400000);    // tomorrow 00:00 UTC
  } else if (quickRange === "yesterday") {
    dateTo   = new Date(utcToday);                          // today   00:00 UTC (exclusive)
    dateFrom = new Date(utcToday.getTime() - 86400000);    // yesterday 00:00 UTC
  } else if (quickRange === "week") {
    dateFrom = new Date(utcToday.getTime() - 7 * 86400000); // 7 days ago 00:00 UTC
    dateTo   = new Date(utcToday.getTime() + 86400000);    // tomorrow 00:00 UTC
  } else {
    // Custom date-picker values arrive as "YYYY-MM-DD".
    // new Date("YYYY-MM-DD") correctly parses to UTC midnight for the FROM bound.
    // For TO, we advance to the start of the *next* day so the selected day is
    // fully included (the query uses lt, not lte).
    if (from) {
      dateFrom = new Date(from);
    }
    if (to) {
      const d = new Date(to);
      d.setUTCDate(d.getUTCDate() + 1);  // advance to start of next day → whole day included
      dateTo = d;
    }
  }

  const where: Record<string, unknown> = {
    status: "APPROVED",
    ...(priority === "true" && { priority: true }),
    ...(outlet   && { outlet }),
    // section filter: when present, only return articles tagged with that section
    ...(section  && { section }),
    ...(dateFrom || dateTo
      ? { publishedAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo   && { lt:  dateTo   }),  // exclusive upper bound
        }}
      : {}),
  };

  // Fetch all and filter in JS for JSON-array fields (SQLite limitation)
  const raw = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
  });

  let filtered = raw;

  // Filter by tag
  if (tag) {
    filtered = filtered.filter((a) =>
      parseJsonArray(a.tags).includes(tag.toLowerCase())
    );
  }

  // Full-text search on title + snippet + manualSummary
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.snippet?.toLowerCase().includes(q) ||
        a.manualSummary?.toLowerCase().includes(q) ||
        a.outlet.toLowerCase().includes(q)
    );
  }

  const total  = filtered.length;
  const start  = (page - 1) * pageSize;
  const paged  = filtered.slice(start, start + pageSize);

  const articles: Article[] = paged.map((a) => ({
    ...a,
    publishedAt:     a.publishedAt.toISOString(),
    createdAt:       a.createdAt.toISOString(),
    updatedAt:       a.updatedAt.toISOString(),
    keywordsMatched: parseJsonArray(a.keywordsMatched),
    tags:            parseJsonArray(a.tags),
    status:          a.status as Article["status"],
    ingestSource:    a.ingestSource as Article["ingestSource"],
    section:         (a.section ?? null) as Article["section"],
  }));

  return NextResponse.json({
    items:    articles,
    total,
    page,
    pageSize,
    hasMore:  start + pageSize < total,
  });
}
