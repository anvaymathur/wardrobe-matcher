"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/types";

const label = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

const fieldClass =
  "rounded-md border border-black/15 bg-background text-foreground px-3 py-2.5 text-sm outline-none focus:border-foreground dark:border-white/20";

export function ClosetControls({ unpairedCount }: { unpairedCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  const push = (next: URLSearchParams) => {
    const s = next.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  };

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (val: string) => {
    setQ(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", val.trim() || null), 300);
  };

  const category = params.get("category");
  const favorite = params.get("favorite") === "1";
  const unpaired = params.get("unpaired") === "1";
  const sort = params.get("sort") ?? "newest";

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active
        ? "border-foreground bg-foreground text-background"
        : "border-black/15 hover:border-foreground dark:border-white/20"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, type, or color…"
          aria-label="Search closet"
          className={`w-full ${fieldClass}`}
        />
        <select
          value={sort}
          aria-label="Sort"
          onChange={(e) => setParam("sort", e.target.value === "newest" ? null : e.target.value)}
          className={fieldClass}
        >
          <option value="newest">Newest</option>
          <option value="name">Name A–Z</option>
          <option value="most-paired">Most paired</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setParam("category", null)} className={chip(!category)}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setParam("category", category === c ? null : c)}
            className={chip(category === c)}
          >
            {label(c)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setParam("favorite", favorite ? null : "1")}
          className={chip(favorite)}
        >
          ★ Favorites
        </button>
        <button
          type="button"
          onClick={() => setParam("unpaired", unpaired ? null : "1")}
          className={chip(unpaired)}
        >
          Unpaired ({unpairedCount})
        </button>
      </div>
    </div>
  );
}
