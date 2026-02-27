/**
 * Prisma Seed Script
 * Run: npm run db:seed
 * Creates:
 *   1. Admin user from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars
 *   2. Sample articles (mixed statuses) for development
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Admin User ──────────────────────────────────────────────────────────
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123!";
  const hash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash: hash },
    create: {
      email,
      passwordHash: hash,
      name: "Admin",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Sample Articles ──────────────────────────────────────────────────────
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const sampleArticles = [
    {
      title: "California Gaming Association Pushes for Expanded Cardroom Regulations",
      outlet: "CalMatters",
      outletDomain: "calmatters.org",
      publishedAt: now,
      url: "https://calmatters.org/sample-1",
      keywordsMatched: JSON.stringify(["California Gaming Association", "California cardroom"]),
      snippet:
        "The California Gaming Association is lobbying Sacramento lawmakers to update the regulatory framework governing the state's 80-plus licensed cardrooms, citing the need for modernized standards to compete with tribal casino operations.",
      status: "QUEUED",
      priority: true,
      tags: JSON.stringify(["regulation", "cardrooms"]),
      ingestSource: "RSS",
    },
    {
      title: "Kyle Kirkland Addresses Tribal Casino Compact Negotiations",
      outlet: "Sacramento Bee",
      outletDomain: "sacbee.com",
      publishedAt: yesterday,
      url: "https://sacbee.com/sample-2",
      keywordsMatched: JSON.stringify(["Kyle Kirkland", "California tribal casino"]),
      snippet:
        "CGA President Kyle Kirkland spoke at a Sacramento press conference Tuesday, outlining concerns over the terms of renewed tribal gaming compacts and their potential impact on commercial gaming operators.",
      status: "APPROVED",
      priority: false,
      tags: JSON.stringify(["tribal", "compacts", "Kyle Kirkland"]),
      ingestSource: "RSS",
    },
    {
      title: "SB 549 Advances in Senate Committee: What It Means for California Gambling",
      outlet: "Legal Sports Report",
      outletDomain: "legalsportsreport.com",
      publishedAt: yesterday,
      url: "https://legalsportsreport.com/sample-3",
      keywordsMatched: JSON.stringify(["SB 549 California", "California gambling"]),
      snippet:
        "Senate Bill 549, which would create a new licensing structure for online gaming in California, cleared the Appropriations Committee on a 7-2 vote and now heads to the full Senate.",
      status: "APPROVED",
      priority: true,
      tags: JSON.stringify(["legislation", "SB 549", "online gaming"]),
      ingestSource: "RSS",
    },
    {
      title: "California Sports Betting Initiative Falls Short of Signature Threshold",
      outlet: "Los Angeles Times",
      outletDomain: "latimes.com",
      publishedAt: twoDaysAgo,
      url: "https://latimes.com/sample-4",
      keywordsMatched: JSON.stringify(["California Sports betting"]),
      snippet: null,
      manualSummary:
        "A ballot initiative that would have legalized mobile sports betting in California failed to gather enough valid signatures to qualify for the November ballot, according to state election officials. Backers said they plan to try again in 2026.\n\nThe measure was opposed by tribal gaming interests, who argued that mobile wagering should be reserved for tribal operators under existing compact agreements. Commercial operators backed the initiative as a path to market access.",
      status: "APPROVED",
      priority: false,
      tags: JSON.stringify(["sports betting", "ballot initiative"]),
      ingestSource: "MANUAL",
    },
    {
      title: "California Labor Law Changes Signal New Era for Casino Workers",
      outlet: "KQED",
      outletDomain: "kqed.org",
      publishedAt: twoDaysAgo,
      url: "https://kqed.org/sample-5",
      keywordsMatched: JSON.stringify(["California labor law", "California wage law"]),
      snippet:
        "New amendments to California labor law—effective January 1—impose higher minimum wage floors and mandatory rest-break requirements on hospitality and gaming sector employers across the state.",
      status: "REJECTED",
      priority: false,
      tags: JSON.stringify(["labor", "workers"]),
      ingestSource: "RSS",
    },
    {
      title: "Behind the Paywall: Tribal Compact Analysis (Needs Manual Entry)",
      outlet: "GamblingCompliance",
      outletDomain: "gamblingcompliance.com",
      publishedAt: now,
      url: "https://gamblingcompliance.com/sample-6",
      keywordsMatched: JSON.stringify(["California tribal casino"]),
      snippet: null,
      status: "NEEDS_MANUAL",
      priority: true,
      tags: JSON.stringify(["tribal", "analysis"]),
      ingestSource: "RSS",
    },
  ];

  for (const article of sampleArticles) {
    await prisma.article.upsert({
      where: { url: article.url },
      update: {},
      create: article,
    });
  }
  console.log(`✅ Created ${sampleArticles.length} sample articles`);

  // ─── Sample Audit Logs ────────────────────────────────────────────────────
  const approvedArticle = await prisma.article.findFirst({
    where: { status: "APPROVED", outlet: "Sacramento Bee" },
  });

  if (approvedArticle) {
    await prisma.auditLog.create({
      data: {
        articleId: approvedArticle.id,
        action: "APPROVED",
        actorEmail: admin.email,
        details: JSON.stringify({ note: "Seed audit log entry" }),
      },
    });
    console.log("✅ Sample audit log created");
  }

  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
