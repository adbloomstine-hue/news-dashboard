/**
 * GET /api/admin/ingest/last-run
 *
 * Returns the most recent completed IngestRun record, plus aggregate totals
 * across all runs in that batch (grouped by startedAt within a 5-minute window).
 *
 * Used by AdminNav to display "last run" info.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the most recent finishedAt across all runs
  const latest = await prisma.ingestRun.findFirst({
    where:   { finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
  });

  if (!latest || !latest.finishedAt) {
    return NextResponse.json({ lastRun: null });
  }

  // Aggregate all runs within 5 minutes of this latest run's startedAt
  // (all adapters in the same runIngestion() call share a close startedAt)
  const windowStart = new Date(latest.startedAt.getTime() - 5 * 60 * 1000);
  const windowEnd   = new Date(latest.startedAt.getTime() + 5 * 60 * 1000);

  const batchRuns = await prisma.ingestRun.findMany({
    where: {
      startedAt:  { gte: windowStart, lte: windowEnd },
      finishedAt: { not: null },
    },
  });

  const totals = batchRuns.reduce(
    (acc, r) => ({
      articlesFound:   acc.articlesFound   + r.articlesFound,
      articlesCreated: acc.articlesCreated + r.articlesCreated,
      articlesDuped:   acc.articlesDuped   + r.articlesDuped,
    }),
    { articlesFound: 0, articlesCreated: 0, articlesDuped: 0 }
  );

  return NextResponse.json({
    lastRun: {
      finishedAt:      latest.finishedAt.toISOString(),
      startedAt:       latest.startedAt.toISOString(),
      ...totals,
    },
  });
}
