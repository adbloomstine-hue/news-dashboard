#!/usr/bin/env node
/**
 * setup-turso.mjs — Create all tables in a Turso database from scratch.
 *
 * Usage:
 *   node scripts/setup-turso.mjs <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>
 *
 * Example:
 *   node scripts/setup-turso.mjs "libsql://mydb-myorg.turso.io" "eyJhb..."
 *
 * This script creates every table defined in prisma/schema.prisma.
 * Safe to re-run — uses IF NOT EXISTS on all statements.
 */

import { createClient } from "@libsql/client";

const [url, authToken] = process.argv.slice(2);

if (!url || !authToken) {
  console.error(
    "Usage: node scripts/setup-turso.mjs <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>"
  );
  process.exit(1);
}

const db = createClient({ url, authToken });

const statements = [
  // ── Article ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "Article" (
    "id"              TEXT NOT NULL PRIMARY KEY,
    "title"           TEXT NOT NULL,
    "outlet"          TEXT NOT NULL,
    "outletDomain"    TEXT NOT NULL,
    "publishedAt"     DATETIME NOT NULL,
    "url"             TEXT NOT NULL,
    "keywordsMatched" TEXT NOT NULL DEFAULT '[]',
    "snippet"         TEXT,
    "manualSummary"   TEXT,
    "status"          TEXT NOT NULL DEFAULT 'QUEUED',
    "priority"        BOOLEAN NOT NULL DEFAULT 0,
    "tags"            TEXT NOT NULL DEFAULT '[]',
    "ingestSource"    TEXT NOT NULL DEFAULT 'RSS',
    "imageUrl"        TEXT,
    "author"          TEXT,
    "section"         TEXT,
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Article_url_key" ON "Article"("url")`,
  `CREATE INDEX IF NOT EXISTS "Article_status_idx" ON "Article"("status")`,
  `CREATE INDEX IF NOT EXISTS "Article_publishedAt_idx" ON "Article"("publishedAt")`,
  `CREATE INDEX IF NOT EXISTS "Article_outletDomain_idx" ON "Article"("outletDomain")`,
  `CREATE INDEX IF NOT EXISTS "Article_section_idx" ON "Article"("section")`,

  // ── AdminUser ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "email"        TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name"         TEXT,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email")`,

  // ── Account (NextAuth) ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "Account" (
    "id"                TEXT NOT NULL PRIMARY KEY,
    "userId"            TEXT NOT NULL,
    "type"              TEXT NOT NULL,
    "provider"          TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token"     TEXT,
    "access_token"      TEXT,
    "expires_at"        INTEGER,
    "token_type"        TEXT,
    "scope"             TEXT,
    "id_token"          TEXT,
    "session_state"     TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,

  // ── Session (NextAuth) ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id"           TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "expires"      DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken")`,

  // ── VerificationToken (NextAuth) ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "expires"    DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,

  // ── AuditLog ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id"         TEXT NOT NULL PRIMARY KEY,
    "articleId"  TEXT,
    "action"     TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "timestamp"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details"    TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "AuditLog_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_articleId_idx" ON "AuditLog"("articleId")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp")`,
  `CREATE INDEX IF NOT EXISTS "AuditLog_actorEmail_idx" ON "AuditLog"("actorEmail")`,
];

console.log(`Connecting to ${url.replace(/\/\/.*@/, "//***@")}...`);

let success = 0;
for (const sql of statements) {
  try {
    await db.execute(sql);
    success++;
    // Print a short label from the SQL
    const match = sql.match(/"(\w+)"/);
    if (match) process.stdout.write(`  ✓ ${match[1]}\n`);
  } catch (err) {
    console.error(`  ✗ FAILED:`, err.message);
    console.error(`    SQL: ${sql.slice(0, 100)}...`);
  }
}

console.log(`\nDone — ${success}/${statements.length} statements executed successfully.`);
process.exit(success === statements.length ? 0 : 1);
