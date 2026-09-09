"use client";

import Link from "next/link";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { clearPlannedDay, loadWeekPlans, savePlannedDayAsOutfit, swapPlannedDays } from "@/lib/actions";
import { addDays, dayName, monthDay, weekDays, weekLabel, weekStartKey } from "@/lib/weekDates";
import type { DayPlanLite, PlanItemLite } from "@/lib/planner";

type Plans = Record<string, DayPlanLite>;

// Per-type tint for photo-less items, matching the rest of the app.
const TINT: Record<string, string> = {
  TOP: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50",
  BOTTOM: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-50",
  OUTERWEAR: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50",
  SHOES: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-50",
};

const SLIDE_MS = 240;
const COMMIT_PX = 56; // drag far enough…
const FLICK_PX = 16; // …or flick fast enough
const FLICK_SPEED = 0.45; // px per ms

/** A day's items: photos as thumbnails, photo-less items as tinted tiles that
 * show the full name so they stay identifiable. */
function DayItems({ items }: { items: PlanItemLite[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) =>
        item.imagePath ? (
          <div
            key={item.id}
            className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imagePath}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
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

function WeekPanel({
  start,
  today,
  plans,
  onClear,
  swapFrom,
  onSwapStart,
  onSwapPick,
  onSwapCancel,
}: {
  start: string;
  today: string;
  plans: Plans;
  onClear: (date: string) => void;
  swapFrom: string | null;
  onSwapStart: (date: string) => void;
  onSwapPick: (date: string) => void;
  onSwapCancel: () => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {weekDays(start).map((date) => {
        const plan = plans[date];
        const isToday = date === today;
        const hasPlan = Boolean(plan && plan.items.length > 0);
        const isSource = swapFrom === date;
        return (
          <li
            key={date}
            className={`relative flex flex-col gap-3 rounded-lg border p-4 ${
              isToday ? "border-foreground" : "border-black/10 dark:border-white/15"
            }`}
          >
            {swapFrom && (
              // While swapping, the whole card becomes the target so you can
              // still see what's on the day you're aiming at.
              <button
                type="button"
                onClick={() => (isSource ? onSwapCancel() : onSwapPick(date))}
                className={`absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed ${
                  isSource
                    ? "border-black/30 bg-background/60 dark:border-white/30"
                    : "border-emerald-500 bg-emerald-500/10"
                }`}
              >
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow ${
                    isSource
                      ? "bg-foreground text-background"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {isSource ? "Cancel" : hasPlan ? "Swap with this" : "Move here"}
                </span>
              </button>
            )}
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

            {plan && plan.items.length > 0 ? (
              <>
                <Link href={`/week/${date}`} className="block">
                  <DayItems items={plan.items} />
                </Link>

                {plan.note && (
                  <p className="border-l-2 border-amber-400/70 pl-2.5 text-sm italic leading-snug text-black/55 dark:border-amber-400/50 dark:text-white/55">
                    {plan.note}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <Link
                    href={`/week/${date}`}
                    className="font-medium text-black/70 hover:underline dark:text-white/70"
                  >
                    Edit
                  </Link>
                  <form action={savePlannedDayAsOutfit}>
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="name" value={`${dayName(date)} · ${monthDay(date)}`} />
                    <button
                      type="submit"
                      className="font-medium text-black/70 hover:underline dark:text-white/70"
                    >
                      Save to outfits
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => onSwapStart(date)}
                    className="font-medium text-black/70 hover:underline dark:text-white/70"
                  >
                    Swap
                  </button>
                  <button
                    type="button"
                    onClick={() => onClear(date)}
                    className="font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Clear
                  </button>
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
  );
}

/**
 * Week view as a swipeable carousel. Three weeks are rendered at once and moving
 * between them is pure CSS transform on the client — no navigation, no data
 * fetch on the common path, so it stays responsive on a phone. The drag writes
 * the transform straight to the DOM (never React state) so nothing re-renders
 * while your finger is down.
 */
export function WeekCarousel({
  initialStart,
  todayStart,
  today,
  initialPlans,
}: {
  initialStart: string;
  todayStart: string;
  today: string;
  initialPlans: Plans;
}) {
  const [center, setCenter] = useState(initialStart);
  const [plans, setPlans] = useState<Plans>(initialPlans);
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(
    new Set([addDays(initialStart, -7), initialStart, addDays(initialStart, 7)]),
  );
  const drag = useRef<{ x: number; y: number; t: number; axis: null | "h" | "v"; dx: number } | null>(
    null,
  );
  const moved = useRef(false);
  // Mirrors `center` for event handlers, which can run between a state update
  // and the next render (e.g. a second swipe landing mid-slide).
  const centerRef = useRef(initialStart);
  const pending = useRef<{ timer: number; week: string } | null>(null);

  const setTrack = (px: number, animate: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : "none";
    el.style.transform = `translate3d(calc(-100% + ${px}px), 0, 0)`;
  };

  const syncUrl = (week: string) => {
    window.history.replaceState(null, "", week === todayStart ? "/week" : `/week?start=${week}`);
  };

  // Pull in any of the three visible weeks we don't have yet. Days render from
  // date math immediately, so a not-yet-loaded week just fills in when it lands.
  const ensureLoaded = (c: string) => {
    for (const wk of [addDays(c, -7), c, addDays(c, 7)]) {
      if (loaded.current.has(wk)) continue;
      loaded.current.add(wk);
      void loadWeekPlans(wk)
        .then((got) => setPlans((prev) => ({ ...prev, ...got })))
        .catch(() => loaded.current.delete(wk)); // let a later swipe retry
    }
  };

  const settle = (week: string) => {
    // Swap the data under the viewport, then jump the track back to the middle
    // slot in the same frame — the panel the user is looking at doesn't move.
    centerRef.current = week;
    flushSync(() => setCenter(week));
    setTrack(0, false);
    syncUrl(week);
    ensureLoaded(week);
  };

  /** Land an in-flight slide right now, so the next gesture starts clean
   * instead of being dropped. */
  const flushPending = () => {
    const p = pending.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    pending.current = null;
    settle(p.week);
  };

  const go = (dir: "next" | "prev") => {
    flushPending();
    const el = trackRef.current;
    if (!el) return;
    const week = addDays(centerRef.current, dir === "next" ? 7 : -7);
    setTrack(dir === "next" ? -el.offsetWidth : el.offsetWidth, true);
    const timer = window.setTimeout(() => {
      pending.current = null;
      settle(week);
    }, SLIDE_MS);
    pending.current = { timer, week };
  };

  const jumpToToday = () => {
    flushPending();
    setTrack(0, false);
    centerRef.current = todayStart;
    setCenter(todayStart);
    syncUrl(todayStart);
    ensureLoaded(todayStart);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse") return; // mouse uses the week labels
    flushPending();
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), axis: null, dx: 0 };
    moved.current = false;
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      d.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (d.axis !== "h") return;
    d.dx = dx;
    moved.current = true;
    setTrack(dx, false); // straight to the DOM — no React render per frame
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "h") return;
    const speed = Math.abs(d.dx) / Math.max(1, performance.now() - d.t);
    const commit =
      Math.abs(d.dx) > COMMIT_PX || (Math.abs(d.dx) > FLICK_PX && speed > FLICK_SPEED);
    if (commit) {
      go(d.dx < 0 ? "next" : "prev");
    } else {
      setTrack(0, true); // snap back
    }
  };

  const onPointerCancel = () => {
    if (drag.current?.axis === "h") setTrack(0, true);
    drag.current = null;
  };

  const clearDay = (date: string) => {
    setPlans((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
    const fd = new FormData();
    fd.set("date", date);
    void clearPlannedDay(fd);
  };

  /** Re-read a week, replacing it wholesale — a merge can't clear days that no
   * longer have a plan. */
  const refreshWeek = (wk: string) =>
    loadWeekPlans(wk)
      .then((got) =>
        setPlans((prev) => {
          const next = { ...prev };
          for (const d of weekDays(wk)) delete next[d];
          return { ...next, ...got };
        }),
      )
      .catch(() => {}); // offline: keep what's on screen

  const swapDays = (a: string, b: string) => {
    setSwapFrom(null);
    if (a === b) return;
    setPlans((prev) => {
      const next = { ...prev };
      if (prev[b]) next[a] = prev[b];
      else delete next[a];
      if (prev[a]) next[b] = prev[a];
      else delete next[b];
      return next;
    });
    // Reconcile after the write, in case a target week wasn't loaded yet and
    // the optimistic guess treated it as empty.
    void swapPlannedDays(a, b)
      .then(() => Promise.all([...new Set([weekStartKey(a), weekStartKey(b)])].map(refreshWeek)))
      .catch(() => {
        for (const wk of new Set([weekStartKey(a), weekStartKey(b)])) void refreshWeek(wk);
      });
  };

  const prevWeek = addDays(center, -7);
  const nextWeek = addDays(center, 7);
  const offToday = center !== todayStart;
  const sideLabel =
    "min-w-0 flex-1 truncate text-[11px] text-black/35 transition-colors hover:text-black/60 dark:text-white/35 dark:hover:text-white/60";

  return (
    <>
      {/* Neighbouring weeks are named on both sides, so it's obvious the view
          continues left and right (and they're tappable on desktop). */}
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => go("prev")} className={`${sideLabel} text-left`}>
          ‹ {weekLabel(prevWeek)}
        </button>
        <span className="shrink-0 text-sm font-medium text-black/70 dark:text-white/70">
          {weekLabel(center)}
        </span>
        <button type="button" onClick={() => go("next")} className={`${sideLabel} text-right`}>
          {weekLabel(nextWeek)} ›
        </button>
      </div>

      {swapFrom && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <span className="min-w-0">
            Pick a day to swap{" "}
            <span className="font-medium">
              {dayName(swapFrom)} {monthDay(swapFrom)}
            </span>{" "}
            with — you can swipe to another week too.
          </span>
          <button
            type="button"
            onClick={() => setSwapFrom(null)}
            className="shrink-0 font-medium hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={(e) => {
          // A swipe that ends over a link shouldn't open it.
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        <div
          ref={trackRef}
          className="flex w-full"
          style={{ transform: "translate3d(-100%, 0, 0)", willChange: "transform" }}
        >
          {[prevWeek, center, nextWeek].map((ws) => (
            <div key={ws} className="w-full shrink-0">
              <WeekPanel
                start={ws}
                today={today}
                plans={plans}
                onClear={clearDay}
                swapFrom={swapFrom}
                onSwapStart={setSwapFrom}
                onSwapPick={(date) => swapFrom && swapDays(swapFrom, date)}
                onSwapCancel={() => setSwapFrom(null)}
              />
            </div>
          ))}
        </div>
      </div>

      {offToday && (
        <>
          <button
            type="button"
            onClick={jumpToToday}
            className="mx-auto mt-6 hidden text-sm font-medium text-black/60 hover:underline sm:block dark:text-white/60"
          >
            Jump to today
          </button>
          <button
            type="button"
            onClick={jumpToToday}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-lg sm:hidden"
          >
            Jump to today
          </button>
        </>
      )}
    </>
  );
}
