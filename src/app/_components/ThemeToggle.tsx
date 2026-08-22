"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const apply = (next: Theme) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  const btn = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-foreground text-background" : "text-black/60 dark:text-white/60"
    }`;

  return (
    <div className="flex gap-1 rounded-lg border border-black/15 p-1 dark:border-white/20">
      <button type="button" aria-pressed={theme === "light"} onClick={() => apply("light")} className={btn(theme === "light")}>
        Light
      </button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => apply("dark")} className={btn(theme === "dark")}>
        Dark
      </button>
    </div>
  );
}
