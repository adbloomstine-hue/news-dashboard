/**
 * Keyword tracking configuration.
 *
 * Keywords are now stored in the database (Keyword model) and managed
 * through the admin panel at /admin/keywords.
 *
 * On first load, if the DB is empty, the DEFAULT_KEYWORDS array below
 * is automatically seeded so the system works out-of-the-box.
 *
 * Articles are matched against enabled keywords (case-insensitive).
 */

import prisma from "@/lib/prisma";

/** Fallback / seed keywords — used if no keywords exist in DB yet. */
export const DEFAULT_KEYWORDS: string[] = [
  "California Gaming Association",
  "California Gaming Assn",
  "Kyle Kirkland",
  "California cardroom",
  "California casino",
  "California tribal casino",
  "California gambling",
  "California Sports betting",
  "California wage law",
  "California labor law",
  "SB 549 California",
];

/** Seed the DB from DEFAULT_KEYWORDS (called once on first run). */
async function seedDefaultKeywords(): Promise<void> {
  for (const term of DEFAULT_KEYWORDS) {
    await prisma.keyword.upsert({
      where:  { term },
      update: {},
      create: { term, enabled: true },
    });
  }
}

/**
 * Load all *enabled* keywords from the database.
 * Always syncs DEFAULT_KEYWORDS (idempotent upsert) so any missing defaults
 * are added even if the table already has user-defined keywords.
 * Falls back to DEFAULT_KEYWORDS on any DB error.
 */
export async function getTrackedKeywords(): Promise<string[]> {
  try {
    // Always ensure all default keywords exist (upsert with update:{} is a no-op
    // for existing rows, so user-added or modified keywords are never overwritten)
    await seedDefaultKeywords();

    const rows = await prisma.keyword.findMany({
      where:   { enabled: true },
      orderBy: { createdAt: "asc" },
      select:  { term: true },
    });

    return rows.map((r) => r.term);
  } catch {
    // DB not available (e.g. CLI before migration) — use hardcoded list
    return DEFAULT_KEYWORDS;
  }
}

/**
 * Check which keywords from the provided list appear in a given text blob.
 *
 * @param text      Combined text to search (title + snippet + description)
 * @param keywords  List of keyword strings to match against
 * @returns         Array of matched keyword strings
 */
export function matchKeywords(text: string, keywords: string[]): string[] {
  if (!text || !keywords.length) return [];
  const normalized = text.toLowerCase();
  return keywords.filter((kw) => normalized.includes(kw.toLowerCase()));
}

/**
 * Check if any keyword matches exist in the text.
 */
export function hasKeywordMatch(text: string, keywords: string[]): boolean {
  return matchKeywords(text, keywords).length > 0;
}
