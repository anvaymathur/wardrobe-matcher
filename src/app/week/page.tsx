import { getPlansForRange, todayKey, weekStartKey, addDays, isValidKey } from "@/lib/planner";
import { WeekCarousel } from "@/app/_components/WeekCarousel";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const sp = await searchParams;
  const today = todayKey();
  const start = weekStartKey(sp.start && isValidKey(sp.start) ? sp.start : today);

  // Render the week either side of the one asked for too, so the first swipe in
  // either direction is instant.
  const plans = await getPlansForRange(addDays(start, -7), 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">This week</h1>
      <WeekCarousel
        initialStart={start}
        todayStart={weekStartKey(today)}
        today={today}
        initialPlans={plans}
      />
    </div>
  );
}
