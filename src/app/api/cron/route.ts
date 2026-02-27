/**
 * GET /api/cron — Scheduled ingestion endpoint
 *
 * Usage:
 *   Vercel Cron: add to vercel.json → { "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }] }
 *   External cron: curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.com/api/cron
 *
 * Security: Requires CRON_SECRET env var Bearer token.
 */

import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/ingestion/index";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.warn("CRON_SECRET not set — cron endpoint is unsecured!");
  } else {
    const auth   = req.headers.get("authorization") ?? "";
    const token  = auth.replace(/^Bearer\s+/i, "");
    const valid  =
      token === cronSecret ||
      // Vercel sends cron token differently
      req.headers.get("x-vercel-cron") === "1";

    if (!valid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  logger.info("Cron ingestion triggered");

  try {
    const summary      = await runIngestion();
    const totalCreated = summary.totalCreated;
    logger.info({ totalCreated }, "Cron ingestion complete");
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    logger.error({ err }, "Cron ingestion failed");
    return NextResponse.json({ error: "Ingestion failed" }, { status: 500 });
  }
}

// Required by Vercel Cron
export const dynamic = "force-dynamic";
