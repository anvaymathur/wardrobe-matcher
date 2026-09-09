import Link from "next/link";
import { getWeek, todayKey, weekStartKey, addDays, dayName, monthDay, weekLabel, isValidKey, type WeekDay } from "@/lib/planner";
import { clearPlannedDay, savePlannedDayAsOutfit } from "@/lib/actions";
import { WeekNav } from "@/app/_components/WeekNav";

// Per-type tint for photo-less items, matching the rest of the app.
const TINT: Record<string, string> = {
  TOP: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50",
  BOTTOM: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-50",
  OUTERWEAR: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50",
  SHOES: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-50",
};

/** A day's items: a photo becomes a square thumbnail; a photo-less item becomes
 * a tinted chip showing its full name, so it stays identifiable instead of an
 * anonymous grey box. */
function DayItems({ items }: { items: NonNullable<WeekDay["plan"]>["items"] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ item }) =>
        item.imagePath ? (
          <div
            key={item.id}
            className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <span
            key={item.id}
            title={item.name}
            className={`flex h-20 w-20 items-center justify-center rounded-lg p-1.5 text-center text-xs font-medium leading-tight ${
              TINT[item.category] ?? "bg-black/5 dark:bg-white/10"
            }`}
          >
            <span className="line-clamp-3">{item.name}</span>
          </span>
        ),
      )}
    </div>
  );
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const sp = await searchParams;
  const today = todayKey();
  const start = weekStartKey(sp.start && isValidKey(sp.start) ? sp.start : today);
  const thisWeekStart = weekStartKey(today);

  const week = await getWeek(start);
  const prev = addDays(start, -7);
  const next = addDays(start, 7);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
        {start !== thisWeekStart && (
          <Link
            href="/week"
            className="hidden rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Today
          </Link>
        )}
      </div>

      {/* Week label; the arrows live at the screen edges (in WeekNav), and you
          can swipe to change weeks. */}
      <div className="mb-6 text-center">
        <span className="text-sm font-medium text-black/70 dark:text-white/70">{weekLabel(start)}</span>
      </div>

      <WeekNav prevStart={prev} nextStart={next} currentStart={start} todayStart={thisWeekStart}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {week.map(({ date, plan }) => {
            const count = plan?.items.length ?? 0;
            const isToday = date === today;
            return (
              <li
                key={date}
                className={`flex flex-col gap-3 rounded-lg border p-4 ${
                  isToday ? "border-foreground" : "border-black/10 dark:border-white/15"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {dayName(date)}{" "}
                    <span className="text-black/50 dark:text-white/50">{monthDay(date)}</span>
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                      Today
                    </span>
                  )}
                </div>

                {count > 0 ? (
                  <>
                    <Link href={`/week/${date}`} className="block">
                      <DayItems items={plan!.items} />
                    </Link>

                    {plan!.note && (
                      <p className="border-l-2 border-amber-400/70 pl-2.5 text-sm italic leading-snug text-black/55 dark:border-amber-400/50 dark:text-white/55">
                        {plan!.note}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <Link href={`/week/${date}`} className="font-medium text-black/70 hover:underline dark:text-white/70">
                        Edit
                      </Link>
                      <form action={savePlannedDayAsOutfit}>
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="name" value={`${dayName(date)} · ${monthDay(date)}`} />
                        <button type="submit" className="font-medium text-black/70 hover:underline dark:text-white/70">
                          Save to outfits
                        </button>
                      </form>
                      <form action={clearPlannedDay}>
                        <input type="hidden" name="date" value={date} />
                        <button type="submit" className="font-medium text-red-600 hover:underline dark:text-red-400">
                          Clear
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <Link
                    href={`/week/${date}`}
                    className="flex items-center justify-center rounded-md border border-dashed border-black/20 py-4 text-sm text-black/50 hover:border-foreground hover:text-foreground dark:border-white/25 dark:text-white/50"
                  >
                    + Plan this day
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </WeekNav>
    </div>
  );
}
