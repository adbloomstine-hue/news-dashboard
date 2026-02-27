/**
 * GET /api/queue — Admin review queue (all non-approved articles)
 * POST /api/queue — Create manual article entry
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";
import { parseJsonArray } from "@/lib/utils";
import type { Article } from "@/types";

const manualEntrySchema = z.object({
  title:         z.string().min(1).max(500),
  outlet:        z.string().min(1).max(200),
  outletDomain:  z.string().min(1).max(200),
  url:           z.string().url(),
  publishedAt:   z.string().datetime(),
  snippet:       z.string().max(1000).optional(),
  manualSummary: z.string().max(10000).optional(),
  tags:          z.array(z.string().max(50)).max(20).default([]),
  priority:      z.boolean().default(false),
  status:        z.enum(["QUEUED", "APPROVED", "NEEDS_MANUAL"]).default("QUEUED"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const validStatuses = ["QUEUED", "APPROVED", "REJECTED", "NEEDS_MANUAL"];
  const status = validStatuses.includes(statusParam ?? "")
    ? statusParam
    : undefined;

  const articles = await prisma.article.findMany({
    where: status ? { status } : { status: { in: ["QUEUED", "NEEDS_MANUAL"] } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const formatted: Article[] = articles.map((a) => ({
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

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = manualEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { tags, ...data } = parsed.data;

  // Check for duplicate URL
  const existing = await prisma.article.findUnique({ where: { url: data.url } });
  if (existing) {
    return NextResponse.json({ error: "Article with this URL already exists", id: existing.id }, { status: 409 });
  }

  const keywords: string[] = [];

  const article = await prisma.article.create({
    data: {
      title:           sanitizeText(data.title),
      outlet:          sanitizeText(data.outlet),
      outletDomain:    sanitizeText(data.outletDomain),
      url:             data.url,
      publishedAt:     new Date(data.publishedAt),
      snippet:         data.snippet ? sanitizeText(data.snippet) : null,
      manualSummary:   data.manualSummary ? sanitizeText(data.manualSummary) : null,
      keywordsMatched: JSON.stringify(keywords),
      tags:            JSON.stringify(tags.map(sanitizeText)),
      priority:        data.priority,
      status:          data.status,
      ingestSource:    "MANUAL",
    },
  });

  await writeAuditLog({
    articleId:  article.id,
    action:     "MANUAL_ENTRY",
    actorEmail: session.user.email,
    details:    { url: data.url, status: data.status },
  });

  return NextResponse.json(
    {
      ...article,
      publishedAt:     article.publishedAt.toISOString(),
      createdAt:       article.createdAt.toISOString(),
      updatedAt:       article.updatedAt.toISOString(),
      keywordsMatched: keywords,
      tags:            tags,
    },
    { status: 201 }
  );
}
