"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createOutfit } from "@/lib/actions";
import { Swipeable } from "@/app/_components/Swipeable";

type Item = {
  id: string;
  name: string;
  imagePath: string | null;
  category: string;
  subtype: string;
};
type Pairing = { itemAId: string; itemBId: string; tier: number };

// Head-to-toe display order.
const DISPLAY_ORDER = ["OUTERWEAR", "TOP", "BOTTOM", "SHOES"] as const;
const catLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function Shuffler({ items, pairings }: { items: Item[]; pairings: Pairing[] }) {
  const byCat = useMemo(() => {
    const m: Record<string, Item[]> = { TOP: [], BOTTOM: [], SHOES: [], OUTERWEAR: [] };
    for (const it of items) (m[it.category] ??= []).push(it);
    return m;
  }, [items]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // partnerId -> list of {id, tier}
  const partners = useMemo(() => {
    const m = new Map<string, { id: string; tier: number }[]>();
    const add = (a: string, b: string, tier: number) => {
      const list = m.get(a) ?? [];
      list.push({ id: b, tier });
      m.set(a, list);
    };
    for (const p of pairings) {
      add(p.itemAId, p.itemBId, p.tier);
      add(p.itemBId, p.itemAId, p.tier);
    }
    return m;
  }, [pairings]);

  const [mode, setMode] = useState<"smart" | "random">("smart");
  const [included, setIncluded] = useState<Set<string>>(new Set(["TOP", "BOTTOM"]));
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<Record<string, string | null>>({});

  const shuffle = useCallback(() => {
    setCurrent((prev) => {
      const next: Record<string, string | null> = {};
      const order = DISPLAY_ORDER.filter((c) => included.has(c));
      const anchor = included.has("TOP") ? "TOP" : order[0];

      for (const cat of order) {
        if (locked.has(cat) && prev[cat]) {
          next[cat] = prev[cat];
          continue;
        }
        const pool = byCat[cat] ?? [];
        if (mode === "smart" && cat !== anchor && next[anchor]) {
          const parts = (partners.get(next[anchor]!) ?? []).filter(
            (pt) => itemById.get(pt.id)?.category === cat,
          );
          if (parts.length) {
            // Weight better tiers more heavily (tier 1 → 3×, tier 2 → 2×, tier 3 → 1×).
            const weighted: string[] = [];
            for (const pt of parts) for (let i = 0; i < 4 - pt.tier; i++) weighted.push(pt.id);
            next[cat] = pickRandom(weighted);
            continue;
          }
        }
        next[cat] = pool.length ? pickRandom(pool).id : null;
      }
      return next;
    });
  }, [byCat, included, locked, mode, partners, itemById]);

  // Roll on mount and whenever the mode or included categories change.
  useEffect(() => {
    shuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, included]);

  const toggleSet = (setter: typeof setIncluded, key: string) =>
    setter((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const shownCats = DISPLAY_ORDER.filter((c) => included.has(c));
  const selectedIds = shownCats.map((c) => current[c]).filter(Boolean) as string[];

  const saveFormRef = useRef<HTMLFormElement>(null);
  const saveIfPossible = () => {
    if (selectedIds.length > 0) saveFormRef.current?.requestSubmit();
  };

  const seg = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? "bg-foreground text-background" : "text-black/60 dark:text-white/60"
    }`;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-colors ${
      active
        ? "border-foreground bg-foreground text-background"
        : "border-black/15 hover:border-foreground dark:border-white/20"
    }`;

  if (items.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-black/15 px-6 py-16 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
        Add some clothes to your closet, then come back to shuffle outfits.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-black/15 p-1 dark:border-white/20">
          <button type="button" onClick={() => setMode("smart")} className={seg(mode === "smart")}>
            Smart
          </button>
          <button type="button" onClick={() => setMode("random")} className={seg(mode === "random")}>
            Random
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["TOP", "BOTTOM", "SHOES", "OUTERWEAR"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleSet(setIncluded, c)}
              className={chip(included.has(c))}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <Swipeable onSwipeLeft={shuffle} onSwipeRight={saveIfPossible} rotate className="flex flex-col gap-2">
        {shownCats.map((cat) => {
          const item = current[cat] ? itemById.get(current[cat]!) : null;
          const isLocked = locked.has(cat);
          return (
            <div
              key={cat}
              className="flex items-center gap-3 rounded-lg border border-black/10 p-2 dark:border-white/15"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                {item?.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-1 text-center text-[11px] text-black/40 dark:text-white/40">
                    {item ? "No photo" : `No ${catLabel(cat).toLowerCase()} yet`}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-black/40 dark:text-white/40">
                  {catLabel(cat)}
                </p>
                {item ? (
                  <Link href={`/items/${item.id}`} className="block truncate text-sm font-medium hover:underline">
                    {item.name}
                  </Link>
                ) : (
                  <p className="text-sm text-black/40 dark:text-white/40">—</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleSet(setLocked, cat)}
                aria-pressed={isLocked}
                aria-label={isLocked ? `Unlock ${catLabel(cat)}` : `Lock ${catLabel(cat)}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${
                  isLocked
                    ? "bg-foreground text-background"
                    : "text-black/40 hover:text-foreground dark:text-white/40"
                }`}
              >
                {isLocked ? "🔒" : "🔓"}
              </button>
            </div>
          );
        })}
      </Swipeable>

      <p className="text-center text-xs text-black/40 dark:text-white/40">
        Swipe ← to shuffle · → to save
      </p>

      <button
        type="button"
        onClick={shuffle}
        className="w-full rounded-full bg-foreground px-5 py-3.5 text-base font-semibold text-background transition-opacity hover:opacity-90"
      >
        🎲 Shuffle
      </button>

      <form ref={saveFormRef} action={createOutfit}>
        <input type="hidden" name="name" value={`Shuffle · ${new Date().toLocaleDateString()}`} />
        {selectedIds.map((id) => (
          <input key={id} type="hidden" name="itemId" value={id} />
        ))}
        <button
          type="submit"
          disabled={selectedIds.length === 0}
          className="w-full rounded-full border border-black/15 px-5 py-3 text-sm font-medium transition-colors hover:border-foreground disabled:opacity-40 dark:border-white/20"
        >
          Save as outfit
        </button>
      </form>

      <Link
        href="/builder"
        className="text-center text-sm text-black/50 hover:underline dark:text-white/50"
      >
        Or browse matches for a specific item →
      </Link>
    </div>
  );
}
