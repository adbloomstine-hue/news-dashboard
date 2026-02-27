import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Please configure your Turso database credentials."
    );
  }

  const libsql = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const adapter = new PrismaLibSQL(libsql);

  return new PrismaClient({ adapter });
}

/**
 * Lazy singleton — only connects on first property access, not at import time.
 * This prevents build-time failures when env vars aren't available.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = buildPrismaClient();
    }
    return Reflect.get(globalForPrisma.prisma, prop);
  },
});

export default prisma;
