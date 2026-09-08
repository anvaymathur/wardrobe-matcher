import Link from "next/link";
import { notFound } from "next/navigation";
import { getItems } from "@/lib/items";
import { getOutfits } from "@/lib/outfits";
import { getPlannedDay, isValidKey, weekStartKey, dayName, monthDay } from "@/lib/planner";
import { DayPlanner } from "@/app/_components/DayPlanner";

export default async function PlanDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidKey(date)) notFound();

  const [items, outfits, plan] = await Promise.all([
    getItems(),
    getOutfits(),
    getPlannedDay(date),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/week?start=${weekStartKey(date)}`}
        className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to week
      </Link>
      <h1 className="mb-1 mt-3 text-2xl font-semibold tracking-tight">
        {dayName(date)}, {monthDay(date)}
      </h1>
      <p className="mb-6 text-sm text-black/50 dark:text-white/50">
        Pick what you’ll wear. Start from a saved outfit, or tap items to build it.
      </p>

      <DayPlanner
        date={date}
        items={items}
        outfits={outfits.map((o) => ({
          id: o.id,
          name: o.name,
          itemIds: o.items.map((oi) => oi.itemId),
        }))}
        defaultSelected={plan?.items.map((pi) => pi.itemId) ?? []}
      />
    </div>
  );
}
