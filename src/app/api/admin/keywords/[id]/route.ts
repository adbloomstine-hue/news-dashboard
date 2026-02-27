/**
 * PATCH  /api/admin/keywords/[id] — Update keyword term or enabled state
 * DELETE /api/admin/keywords/[id] — Delete a keyword
 *
 * Both require admin authentication.
 *
 * Note: Next.js 15 requires params to be typed and awaited as a Promise.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// ── PATCH ─────────────────────────────────────────────────────────────────────
const patchSchema = z.object({
  term:    z.string().trim().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const updateData: { term?: string; enabled?: boolean } = {};
    if (parsed.data.term    !== undefined) updateData.term    = parsed.data.term;
    if (parsed.data.enabled !== undefined) updateData.enabled = parsed.data.enabled;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // If term is changing, check uniqueness
    if (updateData.term) {
      const conflict = await prisma.keyword.findFirst({
        where: { term: updateData.term, NOT: { id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Another keyword with this term already exists." },
          { status: 409 }
        );
      }
    }

    const keyword = await prisma.keyword.update({
      where: { id },
      data:  updateData,
    });

    return NextResponse.json(keyword);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/keywords/[id]] Error:", message);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await prisma.keyword.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/admin/keywords/[id]] Error:", message);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
