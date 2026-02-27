#!/usr/bin/env node
/**
 * seed-admin-turso.mjs — Create an admin user in the Turso database.
 *
 * Usage:
 *   node scripts/seed-admin-turso.mjs <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>
 */

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const [url, authToken] = process.argv.slice(2);

if (!url || !authToken) {
  console.error(
    "Usage: node scripts/seed-admin-turso.mjs <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN>"
  );
  process.exit(1);
}

const db = createClient({ url, authToken });

const email = "a.d.bloomstine@gmail.com";
const password = "CgaAdmin2026!";
const hash = await bcrypt.hash(password, 12);
const id = crypto.randomUUID().replace(/-/g, "").slice(0, 25);
const now = new Date().toISOString();

console.log(`Creating admin user: ${email}`);

try {
  // Upsert — insert or update if email already exists
  const existing = await db.execute({
    sql: `SELECT id FROM "AdminUser" WHERE email = ?`,
    args: [email],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE "AdminUser" SET "passwordHash" = ?, "updatedAt" = ? WHERE email = ?`,
      args: [hash, now, email],
    });
    console.log(`✓ Updated existing admin user: ${email}`);
  } else {
    await db.execute({
      sql: `INSERT INTO "AdminUser" (id, email, "passwordHash", name, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, email, hash, "Admin", now, now],
    });
    console.log(`✓ Created admin user: ${email}`);
  }

  console.log(`\n  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`\n  Change this password after first login.`);
} catch (err) {
  console.error("✗ Failed:", err.message);
  process.exit(1);
}
