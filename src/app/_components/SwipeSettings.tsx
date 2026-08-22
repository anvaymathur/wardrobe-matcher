"use client";

import { useEffect, useState } from "react";

const ACTIONS: [string, string][] = [
  ["none", "Nothing"],
  ["favorite", "Favorite ★"],
  ["edit", "Edit"],
  ["delete", "Delete"],
];

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

const selectClass =
  "rounded-md border border-black/15 bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

export function SwipeSettings() {
  const [left, setLeft] = useState("none");
  const [right, setRight] = useState("favorite");

  useEffect(() => {
    setLeft(readCookie("swipeLeft") ?? "none");
    setRight(readCookie("swipeRight") ?? "favorite");
  }, []);

  const set = (which: "Left" | "Right", val: string) => {
    document.cookie = `swipe${which}=${val}; path=/; max-age=31536000; samesite=lax`;
    if (which === "Left") setLeft(val);
    else setRight(val);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Swipe left</span>
        <select value={left} onChange={(e) => set("Left", e.target.value)} className={selectClass}>
          {ACTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">Swipe right</span>
        <select value={right} onChange={(e) => set("Right", e.target.value)} className={selectClass}>
          {ACTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-black/50 dark:text-white/50">
        Swipe an item in your closet to run these.
      </p>
    </div>
  );
}
