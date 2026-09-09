"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { Swipeable } from "./Swipeable";

/** Wraps the week's day list so it can be swiped left/right to move between
 * weeks (the mobile-primary gesture), and shows a floating "Today" button when
 * you're off the current week. Desktop still has the Prev/Next arrows. */
export function WeekNav({
  prevStart,
  nextStart,
  currentStart,
  todayStart,
  children,
}: {
  prevStart: string;
  nextStart: string;
  currentStart: string;
  todayStart: string;
  children: ReactNode;
}) {
  const router = useRouter();
  // "/week" (no query) is the canonical current-week URL.
  const hrefFor = (start: string) => (start === todayStart ? "/week" : `/week?start=${start}`);
  const go = (start: string) => router.push(hrefFor(start));
  const offToday = currentStart !== todayStart;

  return (
    <>
      <Swipeable onSwipeLeft={() => go(nextStart)} onSwipeRight={() => go(prevStart)}>
        {children}
      </Swipeable>

      {offToday && (
        <Link
          href="/week"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-lg sm:hidden"
        >
          Jump to today
        </Link>
      )}
    </>
  );
}
