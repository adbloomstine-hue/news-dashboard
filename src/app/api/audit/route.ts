/**
 * GET /api/audit — Audit log (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import type { AuditLogEntry } from "@/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page     = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") ?? "50", 10);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      include: {
        article: {
          select: { title: true, outlet: true },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  const formatted: AuditLogEntry[] = entries.map((e) => ({
    id:         e.id,
    articleId:  e.articleId,
    action:     e.action,
    actorEmail: e.actorEmail,
    timestamp:  e.timestamp.toISOString(),
    details:    (() => { try { return JSON.parse(e.details); } catch { return {}; } })(),
    article:    e.article,
  }));

  return NextResponse.json({ items: formatted, total, page, pageSize, hasMore: page * pageSize < total });
}
