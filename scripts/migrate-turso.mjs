/**
 * Ensure the production (Turso) database has the current schema. Runs at build
 * time on Vercel (see the "build" script), where DATABASE_URL + TURSO_AUTH_TOKEN
 * are available, so schema changes ship with the deploy — no manual step.
 *
 * Prisma's migrate engine doesn't cleanly target remote Turso, so we apply the
 * DDL directly with @libsql/client. Everything is CREATE ... IF NOT EXISTS, so
 * it's safe to run on every build. When you add a new table/index in the Prisma
 * schema, add the matching idempotent statement here.
 *
 * Local/dev builds use a `file:` URL that already has the schema (from
 * `prisma migrate dev`), so we skip those.
 */
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !/^(libsql|https?|wss?):/.test(url)) {
  console.log("[migrate-turso] No remote database URL — skipping (local build).");
  process.exit(0);
}

const statements = [
  // Weekly planner (added 2026-09-08)
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

  // Per-week "don't repeat" blocks (added 2026-09-09)
  `CREATE TABLE IF NOT EXISTS "PlannedWeekBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "week" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT,
    CONSTRAINT "PlannedWeekBlock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlannedWeekBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "PlannedWeekBlock_userId_idx" ON "PlannedWeekBlock"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PlannedWeekBlock_userId_week_itemId_key" ON "PlannedWeekBlock"("userId", "week", "itemId")`,
];

// SQLite has no "ADD COLUMN IF NOT EXISTS", so add a column only when missing
// (a plain ADD COLUMN — never a destructive table rebuild on live data).
async function ensureColumn(db, table, column, ddl) {
  const info = await db.execute(`PRAGMA table_info("${table}")`);
  const exists = info.rows.some((r) => r.name === column);
  if (!exists) await db.execute(`ALTER TABLE "${table}" ADD COLUMN ${ddl}`);
}

const db = createClient({ url, authToken });
for (const sql of statements) {
  await db.execute(sql);
}
// Column additions (idempotent).
await ensureColumn(db, "Item", "noRepeat", `"noRepeat" BOOLEAN NOT NULL DEFAULT false`);

console.log("[migrate-turso] Schema ensured on the remote database.");
