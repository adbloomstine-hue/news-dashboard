/**
 * PATCH /api/articles/[id] — Update article fields (admin only)
 * GET  /api/articles/[id] — Get single article
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

const patchSchema = z.object({
  title:         z.string().min(1).max(500).optional(),
  outlet:        z.string().min(1).max(200).optional(),
  outletDomain:  z.string().min(1).max(200).optional(),
  publishedAt:   z.string().datetime().optional(),
  snippet:       z.string().max(1000).optional(),
  manualSummary: z.string().max(10000).optional(),
  tags:          z.array(z.string().max(50)).max(20).optional(),
  priority:      z.boolean().optional(),
  section:       z.enum(["cardrooms", "tribal", "gaming"]).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(formatArticle(article));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tags, section, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = {};

  // Sanitize text fields
  if (rest.title)         updateData.title         = sanitizeText(rest.title);
  if (rest.outlet)        updateData.outlet        = sanitizeText(rest.outlet);
  if (rest.outletDomain)  updateData.outletDomain  = sanitizeText(rest.outletDomain);
  if (rest.publishedAt)   updateData.publishedAt   = new Date(rest.publishedAt);
  if (rest.snippet !== undefined)       updateData.snippet       = sanitizeText(rest.snippet);
  if (rest.manualSummary !== undefined) updateData.manualSummary = sanitizeText(rest.manualSummary);
  if (rest.priority !== undefined)      updateData.priority      = rest.priority;
  if (tags    !== undefined)            updateData.tags          = JSON.stringify(tags.map(sanitizeText));
  if (section !== undefined)            updateData.section       = section; // null clears it

  const updated = await prisma.article.update({
    where: { id },
    data:  updateData,
  });

  await writeAuditLog({
    articleId:  id,
    action:     "EDITED",
    actorEmail: session.user.email,
    details: {
      before: {
        title:         existing.title,
        snippet:       existing.snippet,
        manualSummary: existing.manualSummary,
        tags:          parseJsonArray(existing.tags),
        priority:      existing.priority,
      },
      after: updateData,
    },
  });

  return NextResponse.json(formatArticle(updated));
}

function formatArticle(a: {
  id: string; title: string; outlet: string; outletDomain: string;
  publishedAt: Date; url: string; keywordsMatched: string; snippet: string | null;
  manualSummary: string | null; status: string; priority: boolean; tags: string;
  ingestSource: string; imageUrl: string | null; author: string | null;
  section: string | null; createdAt: Date; updatedAt: Date;
}): Article {
  return {
    ...a,
    publishedAt:     a.publishedAt.toISOString(),
    createdAt:       a.createdAt.toISOString(),
    updatedAt:       a.updatedAt.toISOString(),
    keywordsMatched: parseJsonArray(a.keywordsMatched),
    tags:            parseJsonArray(a.tags),
    status:          a.status     as Article["status"],
    ingestSource:    a.ingestSource as Article["ingestSource"],
    section:         (a.section ?? null) as Article["section"],
  };
}
