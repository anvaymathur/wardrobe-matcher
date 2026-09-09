"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

const THRESHOLD = 64; // px of horizontal travel that commits to a week change

/** Wraps the week's day list so it can be swiped left/right to move between
 * weeks. The current week flings off in the swipe direction and the new one
 * slides in from the opposite edge, so it reads like turning a page. Fading
 * edge arrows (they hide while you scroll, reappear when you stop) and swipe
 * both work; a floating "Jump to today" button shows when you're off today. */
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
  const hrefFor = (s: string) => (s === todayStart ? "/week" : `/week?start=${s}`);
  const offToday = currentStart !== todayStart;

  // Prefetch neighbours so the page swap lands fast enough to feel continuous.
  useEffect(() => {
    router.prefetch(hrefFor(prevStart));
    router.prefetch(hrefFor(nextStart));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevStart, nextStart]);

  // ── drag / fling ──
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  // The week currently flinging away, and which way. Kept until we land on a
  // different week (gated below by `leftFrom === currentStart`).
  const [leaving, setLeaving] = useState<null | "next" | "prev">(null);
  const [leftFrom, setLeftFrom] = useState<string | null>(null);
  // Direction the arriving week should slide in from (persists across the soft
  // navigation, consumed only while the fresh list is mounting).
  const [enterDir, setEnterDir] = useState<null | "next" | "prev">(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<null | "h" | "v">(null);

  const push = (dir: "next" | "prev") => {
    setEnterDir(dir);
    router.push(hrefFor(dir === "next" ? nextStart : prevStart));
  };
  // Arrow taps aren't a fling, so clear any lingering leave state first.
  const arrowNav = (dir: "next" | "prev") => {
    setLeaving(null);
    setLeftFrom(null);
    push(dir);
  };

  const onDown = (e: PointerEvent) => {
    if (leaving) return;
    startPt.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    setDragging(true);
  };
  const onMove = (e: PointerEvent) => {
    if (!startPt.current) return;
    const dX = e.clientX - startPt.current.x;
    const dY = e.clientY - startPt.current.y;
    if (axis.current === null && (Math.abs(dX) > 8 || Math.abs(dY) > 8)) {
      axis.current = Math.abs(dX) > Math.abs(dY) ? "h" : "v";
    }
    if (axis.current === "h") setDx(dX);
  };
  const finish = () => {
    if (!startPt.current) return;
    const travelled = dx;
    const horizontal = axis.current === "h";
    startPt.current = null;
    axis.current = null;
    setDragging(false);
    if (horizontal && Math.abs(travelled) > THRESHOLD) {
      const dir = travelled < 0 ? "next" : "prev";
      setLeftFrom(currentStart);
      setLeaving(dir);
      window.setTimeout(() => push(dir), 190);
    } else {
      setDx(0);
    }
  };

  // ── edge arrows fade out while scrolling, back in when idle ──
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(t);
      t = setTimeout(() => setScrolling(false), 550);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  const showLeave = leaving !== null && leftFrom === currentStart;
  let contentStyle: CSSProperties | undefined;
  if (showLeave) {
    // Continue from the finger's last position out to the screen edge.
    contentStyle = {
      transform: `translateX(${leaving === "next" ? "-100vw" : "100vw"})`,
      opacity: 0,
      transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
    };
  } else if (dragging) {
    contentStyle = {
      transform: `translateX(${dx}px)`,
      opacity: Math.max(0.6, 1 - Math.abs(dx) / 520),
    };
  }
  const enterClass = showLeave
    ? ""
    : enterDir === "next"
      ? "animate-[weekInFromRight_0.24s_ease-out]"
      : enterDir === "prev"
        ? "animate-[weekInFromLeft_0.24s_ease-out]"
        : "";

  const arrowBase =
    "fixed top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-background/70 text-2xl leading-none text-black/60 shadow-sm backdrop-blur transition-opacity duration-300 hover:text-foreground dark:border-white/15 dark:text-white/60";

  return (
    <>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{ touchAction: "pan-y" }}
      >
        <div key={currentStart} className={enterClass} style={contentStyle}>
          {children}
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous week"
        onClick={() => arrowNav("prev")}
        className={`${arrowBase} left-1 sm:left-2 ${scrolling ? "opacity-0" : "opacity-100"}`}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next week"
        onClick={() => arrowNav("next")}
        className={`${arrowBase} right-1 sm:right-2 ${scrolling ? "opacity-0" : "opacity-100"}`}
      >
        ›
      </button>

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
