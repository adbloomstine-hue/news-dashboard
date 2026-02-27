/**
 * Debug script — diagnose why NewsAPI returns zero articles.
 *
 * Run with:
 *   npm run debug:newsapi
 *
 * Shows:
 *   1. API key presence / masked value
 *   2. Keywords loaded from DB
 *   3. Exact query string sent to newsapi.org
 *   4. Raw API response (status, totalResults, first 5 articles)
 *   5. Which articles pass / fail the local keyword re-filter and why
 */

import * as fs from "fs";
import * as path from "path";

// Manually load .env (no dotenv dependency needed)
{
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Helpers (duplicated from adapter to keep script self-contained) ──────────

function buildOrQuery(keywords: string[], budgetChars = 490): { query: string; included: number } {
  const parts: string[] = [];
  let used = 0;
  for (const kw of keywords) {
    const part = `"${kw}"`;
    const sep  = parts.length > 0 ? " OR " : "";
    if (used + sep.length + part.length > budgetChars) break;
    parts.push(part);
    used += sep.length + part.length;
  }
  return { query: parts.join(" OR "), included: parts.length };
}

function matchKeywords(text: string, keywords: string[]): string[] {
  if (!text || !keywords.length) return [];
  const norm = text.toLowerCase();
  return keywords.filter((kw) => norm.includes(kw.toLowerCase()));
}

function mask(key: string): string {
  if (!key) return "(empty)";
  return key.slice(0, 4) + "…" + key.slice(-4) + ` (${key.length} chars)`;
}

function sanitize(s: string): string {
  // strip HTML tags, normalise whitespace
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  NewsAPI Debug");
  console.log("═══════════════════════════════════════════════════════\n");

  // ── 1. API key ─────────────────────────────────────────────────────────────
  const apiKey = process.env.NEWS_API_KEY ?? "";
  console.log(`[1] API key:      ${mask(apiKey)}`);
  console.log(`[1] Provider env: NEWS_API_PROVIDER=${process.env.NEWS_API_PROVIDER ?? "(unset → newsapi)"}\n`);

  if (!apiKey) {
    console.error("❌  NEWS_API_KEY is empty in .env — adapter is disabled.\n");
    process.exit(1);
  }

  // ── 2. Keywords from DB ────────────────────────────────────────────────────
  let keywords: string[] = [];
  try {
    const rows = await prisma.keyword.findMany({
      where:   { enabled: true },
      orderBy: { createdAt: "asc" },
      select:  { term: true },
    });
    keywords = rows.map((r) => r.term);
    console.log(`[2] Keywords loaded from DB (${keywords.length}):`);
    keywords.forEach((k) => console.log(`      "${k}"`));
    console.log();
  } catch (err) {
    console.error("[2] ❌ Could not load keywords from DB:", err);
    process.exit(1);
  }

  // ── 3. Query ───────────────────────────────────────────────────────────────
  const { query, included } = buildOrQuery(keywords);
  console.log(`[3] Keywords included in query: ${included} / ${keywords.length}`);
  if (included < keywords.length) {
    console.log(`[3] ⚠️  ${keywords.length - included} keyword(s) dropped due to query budget.`);
  }
  console.log(`[3] Query (${query.length} chars):\n      ${query}\n`);

  // ── 4. API call ────────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    q:        query,
    language: "en",
    sortBy:   "publishedAt",
    pageSize: "10",    // small for debugging
    apiKey:   apiKey,
  });

  const url = `https://newsapi.org/v2/everything?${params}`;
  console.log(`[4] GET ${url.replace(apiKey, "***API_KEY***")}\n`);

  let responseBody: string;
  let status: number;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NewsDashboard/1.0 (debug)" },
      signal: AbortSignal.timeout(20000),
    });
    status = res.status;
    responseBody = await res.text();
  } catch (err) {
    console.error("[4] ❌ Network error:", err);
    process.exit(1);
  }

  console.log(`[4] HTTP status: ${status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;
  try {
    data = JSON.parse(responseBody);
  } catch {
    console.error("[4] ❌ Non-JSON response body:");
    console.error(responseBody.slice(0, 500));
    process.exit(1);
  }

  if (data.status !== "ok") {
    console.error(`[4] ❌ API error: code=${data.code}  message=${data.message}`);
    process.exit(1);
  }

  const articles = data.articles ?? [];
  console.log(`[4] API returned: totalResults=${data.totalResults}  articles in page=${articles.length}\n`);

  if (articles.length === 0) {
    console.log("[4] ⚠️  API returned 0 articles for this query + time range.");
    console.log("    Try running without a date range, or broadening the keywords.\n");
    process.exit(0);
  }

  // ── 5. Local keyword re-filter ─────────────────────────────────────────────
  console.log("[5] Local keyword re-filter results (title + description checked):");
  console.log("─────────────────────────────────────────────────────────────────");

  let passed = 0;
  let failed = 0;

  for (const a of articles) {
    const title   = sanitize(a.title ?? "");
    const snippet = sanitize((a.description ?? a.content ?? "").slice(0, 500));
    const searchText = `${title} ${snippet}`;
    const matched = matchKeywords(searchText, keywords);

    if (matched.length > 0) {
      passed++;
      console.log(`  ✅ PASS  "${title.slice(0, 70)}"`);
      console.log(`         matched: ${matched.join(", ")}`);
    } else {
      failed++;
      console.log(`  ❌ FAIL  "${title.slice(0, 70)}"`);
      console.log(`         title:   ${title.slice(0, 100)}`);
      console.log(`         snippet: ${snippet.slice(0, 120)}`);
      console.log(`         (keyword not found in title or description)`);
    }
  }

  console.log("─────────────────────────────────────────────────────────────────");
  console.log(`[5] Result: ${passed} passed local filter, ${failed} dropped\n`);

  if (failed > 0 && passed === 0) {
    console.log("⚠️  All API results are being dropped by the local keyword re-filter.");
    console.log("   This usually means the keyword appears in the article body (full text)");
    console.log("   but NOT in the title or description that newsapi.org returns.");
    console.log("   Fix: relax the local re-filter to trust the API's full-text search.\n");
  }

  await prisma.$disconnect();
  process.exit(0);
})();
