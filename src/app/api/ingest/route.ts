/**
 * POST /api/ingest — Manually trigger ingestion (admin only)
 * Rate limited: 10 requests per hour per IP
 *
 * Body (JSON, all optional):
 *   range?: "24h" | "3d" | "7d"   — preset time window
 *   from?:  ISO date string        — custom start date (used when range absent)
 *   to?:    ISO date string        — custom end date   (used when range absent)
 *
 * If neither range nor from/to are provided, ingestion fetches everything
 * currently in the feeds (default adapter behaviour).
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runIngestion } from "@/ingestion/index";
import { rateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

function resolveRange(
  range?: string,
  from?: string,
  to?: string
): { from?: Date; to?: Date } {
  const now = new Date();

  if (range === "24h") {
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
  }
  if (range === "3d") {
    return { from: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), to: now };
  }
  if (range === "7d") {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  }

  // Custom range
  return {
    from: from ? new Date(from) : undefined,
    to:   to   ? new Date(to)   : undefined,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by IP
  const ip    = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = parseInt(process.env.INGEST_RATE_LIMIT ?? "10", 10);
  const rl    = rateLimit(ip, limit, 60 * 60 * 1000);

  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later.", resetAt: rl.resetAt },
      { status: 429 }
    );
  }

  // Parse body (gracefully — body may be empty)
  let body: { range?: string; from?: string; to?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch { /* ignore parse errors */ }

  const dateRange = resolveRange(body.range, body.from, body.to);

  logger.info(
    { actor: session.user.email, range: body.range, from: dateRange.from, to: dateRange.to },
    "Manual ingestion triggered"
  );

  try {
    const summary = await runIngestion(dateRange);
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    logger.error({ err }, "Manual ingestion failed");
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}
