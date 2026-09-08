import Link from "next/link";
import { getWeek, todayKey, weekStartKey, addDays, dayName, monthDay, weekLabel, isValidKey } from "@/lib/planner";
import { clearPlannedDay, savePlannedDayAsOutfit } from "@/lib/actions";

function Thumbs({ images }: { images: (string | null)[] }) {
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  return (
    <div className="flex items-center gap-1.5">
      {shown.map((src, i) => (
        <div
          key={i}
          className="h-12 w-12 shrink-0 overflow-hidden rounded bg-black/5 dark:bg-white/10"
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
      ))}
      {extra > 0 && (
        <span className="text-xs text-black/50 dark:text-white/50">+{extra}</span>
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

  const navLink =
    "rounded-full border border-black/15 px-3 py-1.5 text-sm hover:border-foreground dark:border-white/20";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">This week</h1>
        {start !== thisWeekStart && (
          <Link
            href="/week"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Today
          </Link>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href={`/week?start=${prev}`} className={navLink} aria-label="Previous week">
          ← Prev
        </Link>
        <span className="text-sm font-medium text-black/70 dark:text-white/70">{weekLabel(start)}</span>
        <Link href={`/week?start=${next}`} className={navLink} aria-label="Next week">
          Next →
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {week.map(({ date, plan }) => {
          const count = plan?.items.length ?? 0;
          const isToday = date === today;
          return (
            <li
              key={date}
              className={`flex flex-col gap-3 rounded-lg border p-4 ${
                isToday
                  ? "border-foreground"
                  : "border-black/10 dark:border-white/15"
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
                    <Thumbs images={plan!.items.map((pi) => pi.item.imagePath)} />
                  </Link>
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
    </div>
  );
}
