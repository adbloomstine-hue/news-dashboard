/**
 * POST /api/articles/[id]/approve — Approve a queued article (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cannot approve a NEEDS_MANUAL article without a summary
  if (article.status === "NEEDS_MANUAL" && !article.manualSummary) {
    return NextResponse.json(
      { error: "Manual summary required before approval" },
      { status: 422 }
    );
  }

  const updated = await prisma.article.update({
    where: { id },
    data:  { status: "APPROVED" },
  });

  await writeAuditLog({
    articleId:  id,
    action:     "APPROVED",
    actorEmail: session.user.email,
    details:    { previousStatus: article.status },
  });

  return NextResponse.json({ success: true, status: updated.status });
}
