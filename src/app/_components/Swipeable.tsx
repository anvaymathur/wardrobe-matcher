"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";

/** Horizontal swipe wrapper. Follows the finger, and fires onSwipeLeft/Right
 * past the threshold. Decides horizontal vs vertical intent so vertical page
 * scrolling still works, and taps pass through to child buttons/links. */
export function Swipeable({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  rotate = false,
  className = "",
  children,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  rotate?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<null | "h" | "v">(null);

  const onDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = null;
    setDragging(true);
  };
  const onMove = (e: PointerEvent) => {
    if (!start.current) return;
    const dX = e.clientX - start.current.x;
    const dY = e.clientY - start.current.y;
    if (axis.current === null && (Math.abs(dX) > 8 || Math.abs(dY) > 8)) {
      axis.current = Math.abs(dX) > Math.abs(dY) ? "h" : "v";
    }
    if (axis.current === "h") setDx(dX);
  };
  const finish = (e: PointerEvent) => {
    if (!start.current) return;
    const dX = e.clientX - start.current.x;
    start.current = null;
    setDragging(false);
    if (axis.current === "h") {
      if (dX > threshold) onSwipeRight?.();
      else if (dX < -threshold) onSwipeLeft?.();
    }
    axis.current = null;
    setDx(0);
  };

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      style={{
        transform: `translateX(${dx}px)${rotate ? ` rotate(${dx * 0.03}deg)` : ""}`,
        transition: dragging ? "none" : "transform 0.25s ease",
        touchAction: "pan-y",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
