/**
 * One-time step: create the weekly-planner tables in the Turso (production) DB.
 * Locally, `prisma migrate dev` already applied them to dev.db. Turso migrations
 * are applied separately (see backfill-owner.mts), so run this once against prod.
 *
 * Easiest, using the prod env vars you already have on Vercel:
 *
 *   npx vercel env pull .env.local        # writes DATABASE_URL + TURSO_AUTH_TOKEN
 *   npx tsx --env-file=.env.local apply-planner-migration.mts
 *
 * (Or set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN yourself.) It uses CREATE TABLE /
 * INDEX IF NOT EXISTS, so it's safe to re-run. Delete this file once prod is
 * migrated. NOTE: point it at Turso — with a file: URL it just edits dev.db.
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("Set TURSO_DATABASE_URL (or DATABASE_URL) to your database URL.");

const db = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS "PlannedDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "PlannedDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "PlannedDayItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plannedDayId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "PlannedDayItem_plannedDayId_fkey" FOREIGN KEY ("plannedDayId") REFERENCES "PlannedDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedDayItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "PlannedDay_userId_idx" ON "PlannedDay"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PlannedDay_userId_date_key" ON "PlannedDay"("userId", "date")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PlannedDayItem_plannedDayId_itemId_key" ON "PlannedDayItem"("plannedDayId", "itemId")`,
];

for (const sql of statements) {
  await db.execute(sql);
}

console.log("Weekly-planner tables are ready in Turso.");
