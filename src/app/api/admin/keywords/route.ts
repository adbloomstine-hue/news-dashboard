/**
 * GET  /api/admin/keywords — List all keywords
 * POST /api/admin/keywords — Create a new keyword
 *
 * Both require admin authentication.
 * On first GET, seeds the DB from DEFAULT_KEYWORDS if empty.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { DEFAULT_KEYWORDS } from "@/ingestion/keywords";

// ── Seed helper (idempotent) ──────────────────────────────────────────────────
// Always upserts all DEFAULT_KEYWORDS so missing defaults are added even when
// the table already has user-defined keywords. update:{} is a no-op for existing rows.
async function ensureSeeded() {
  for (const term of DEFAULT_KEYWORDS) {
    await prisma.keyword.upsert({
      where:  { term },
      update: {},
      create: { term, enabled: true },
    });
  }
}

// ── GET — list all keywords ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureSeeded();

    const keywords = await prisma.keyword.findMany({
      orderBy: [{ enabled: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(keywords);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/keywords] Unexpected error:", message);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

// ── POST — create a keyword ───────────────────────────────────────────────────
const createSchema = z.object({
  term:    z.string().trim().min(1, "Term is required").max(200),
  enabled: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { term, enabled } = parsed.data;

    // Check for duplicate
    const existing = await prisma.keyword.findUnique({ where: { term } });
    if (existing) {
      return NextResponse.json(
        { error: "A keyword with this term already exists.", existing },
        { status: 409 }
      );
    }

    const keyword = await prisma.keyword.create({
      data: { term, enabled },
    });

    return NextResponse.json(keyword, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/keywords] Unexpected error:", message);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
