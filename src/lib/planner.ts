import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/currentUser";
import { addDays, weekDays } from "@/lib/weekDates";

// Date math lives in weekDates.ts (no db imports) so client components can use
// it too; re-exported here so existing server-side imports keep working.
export * from "@/lib/weekDates";

/** A day's plan, trimmed to what the week view renders and safe to send to the
 * client (no db row internals). */
export type PlanItemLite = {
  id: string;
  name: string;
  imagePath: string | null;
  category: string;
};
export type DayPlanLite = { note: string | null; items: PlanItemLite[] };

export async function getPlannedDay(date: string) {
  const userId = await requireUserId();
  return prisma.plannedDay.findUnique({
    where: { userId_date: { userId, date } },
    include: { items: { include: { item: true } } },
  });
}

/**
 * Plans for `weeks` consecutive weeks from `startKey` (a Monday), as a
 * date → plan map. One query covers the whole swipe window, so moving between
 * weeks in the carousel costs no extra round trip.
 */
export async function getPlansForRange(
  startKey: string,
  weeks: number,
): Promise<Record<string, DayPlanLite>> {
  const userId = await requireUserId();
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(startKey, i));
  const plans = await prisma.plannedDay.findMany({
    where: { userId, date: { in: days } },
    include: { items: { include: { item: true } } },
  });

  const map: Record<string, DayPlanLite> = {};
  for (const p of plans) {
    map[p.date] = {
      note: p.note,
      items: p.items.map(({ item }) => ({
        id: item.id,
        name: item.name,
        imagePath: item.imagePath,
        category: item.category,
      })),
    };
  }
  return map;
}

/** The 7 days from `startKey` (a Monday), each paired with its plan (or null). */
export async function getWeek(startKey: string) {
  const userId = await requireUserId();
  const days = weekDays(startKey);
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
