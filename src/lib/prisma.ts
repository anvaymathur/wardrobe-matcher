import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 connects through a driver adapter. libSQL works for both a local
// SQLite file (dev) and a hosted Turso database (production) — the only
// difference is the env vars, so the same code runs in both places.
function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

// Reuse a single PrismaClient across Next.js dev hot-reloads to avoid
// exhausting database connections. In production a fresh instance is fine.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
