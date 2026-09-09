import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/currentUser";

// A "day key" is a timezone-free calendar day, "YYYY-MM-DD". All date math runs
// in UTC so it never drifts across DST; only today() reads the local calendar.

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToKey(d);
}

export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const dow = keyToDate(key).getUTCDay(); // 0=Sun … 6=Sat
  const sinceMonday = (dow + 6) % 7;
  return addDays(key, -sinceMonday);
}

export function isValidKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(keyToDate(key).getTime());
}

const dayNameFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const monthDayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const rangeFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const dayName = (key: string) => dayNameFmt.format(keyToDate(key));
export const monthDay = (key: string) => monthDayFmt.format(keyToDate(key));
export const weekLabel = (startKey: string) =>
  `${rangeFmt.format(keyToDate(startKey))} – ${rangeFmt.format(keyToDate(addDays(startKey, 6)))}`;

export async function getPlannedDay(date: string) {
  const userId = await requireUserId();
  return prisma.plannedDay.findUnique({
    where: { userId_date: { userId, date } },
    include: { items: { include: { item: true } } },
  });
}

/** The 7 days from `startKey` (a Monday), each paired with its plan (or null). */
export async function getWeek(startKey: string) {
  const userId = await requireUserId();
  const days = Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
  const plans = await prisma.plannedDay.findMany({
    where: { userId, date: { in: days } },
    include: { items: { include: { item: true } } },
  });
  const byDate = new Map(plans.map((p) => [p.date, p]));
  return days.map((date) => ({ date, plan: byDate.get(date) ?? null }));
}

export type WeekDay = Awaited<ReturnType<typeof getWeek>>[number];

/** Item ids the user flagged "don't repeat" for the given week (its Monday key). */
export async function getWeekBlocks(week: string): Promise<string[]> {
  const userId = await requireUserId();
  const rows = await prisma.plannedWeekBlock.findMany({
    where: { userId, week },
    select: { itemId: true },
  });
  return rows.map((r) => r.itemId);
}
