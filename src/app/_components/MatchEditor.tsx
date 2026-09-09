"use client";

import { useState, useTransition } from "react";
import { createPairing, unpairItems } from "@/lib/actions";
import { CATEGORIES } from "@/lib/types";

export type MatchItem = {
  id: string;
  name: string;
  imagePath: string | null;
  subtype: string;
  category: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  TOP: "Tops",
  BOTTOM: "Bottoms",
  OUTERWEAR: "Outerwear",
  SHOES: "Shoes",
};

// Soft, per-type tint for items with no photo, so they read as intentional
// labelled swatches instead of a broken-looking grey box. Legible in both themes.
const TINT: Record<string, string> = {
  TOP: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50",
  BOTTOM: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-50",
  OUTERWEAR: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50",
  SHOES: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-50",
};

// Match strength ↔ tier. Tier 1 is the best match; the Shuffler weights it
// most heavily. We show it as filled dots (3 = best) so there's no jargon.
const DOTS = 3;
const dotsFilled = (tier: number) => DOTS + 1 - tier; // tier 1 → 3, tier 3 → 1
const tierForDot = (dot: number) => DOTS + 1 - dot; // click dot 3 → tier 1
const STRENGTH_TITLE = ["", "Okay match", "Good match", "Best match"];

/** Tap-to-toggle grid for pairing one item with others. Every cross-category
 * item is a tile (photo + name); tap to match or unmatch. Matched tiles get a
 * strength control (filled dots) that maps to the pairing tier. State is
 * optimistic; the Server Actions persist in the background. */
export function MatchEditor({
  itemId,
  others,
  initialMatched,
}: {
  itemId: string;
  others: MatchItem[];
  /** otherId → tier (1 best … 3). */
  initialMatched: Record<string, number>;
}) {
  const [matched, setMatched] = useState<Record<string, number>>(initialMatched);
  const [, startTransition] = useTransition();

  const persistMatch = (otherId: string, tier: number) => {
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("otherId", otherId);
    fd.set("tier", String(tier));
    startTransition(() => {
      void createPairing(fd);
    });
  };

  const persistUnmatch = (otherId: string) => {
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("otherId", otherId);
    startTransition(() => {
      void unpairItems(fd);
    });
  };

  const toggle = (otherId: string) => {
    setMatched((prev) => {
      const next = { ...prev };
      if (otherId in next) {
        delete next[otherId];
        persistUnmatch(otherId);
      } else {
        next[otherId] = 1; // new matches start as "best"
        persistMatch(otherId, 1);
      }
      return next;
    });
  };

  const setStrength = (otherId: string, tier: number) => {
    setMatched((prev) => ({ ...prev, [otherId]: tier }));
    persistMatch(otherId, tier);
  };

  if (others.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/15 px-6 py-10 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
        Add items in other categories first — you pair a top with a bottom, shoes,
        or outerwear, not with another top.
      </p>
    );
  }

  const groups = CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABEL[category] ?? category,
    items: others.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  const matchCount = Object.keys(matched).length;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-black/55 dark:text-white/55">
        Tap an item to pair it with this one. On a match, tap the dots to set how
        well they go together — stronger matches show up more often in Shuffle.
        {matchCount > 0 && (
          <span className="ml-1 font-medium text-foreground">
            {matchCount} matched.
          </span>
        )}
      </p>

      {groups.map((group) => (
        <div key={group.category}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
            {group.label}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((item) => {
              const isMatched = item.id in matched;
              const tier = matched[item.id];
              return (
                <li key={item.id}>
                  <div
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      isMatched
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-black/10 dark:border-white/15"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-pressed={isMatched}
                      className="block w-full select-none text-left [-webkit-touch-callout:none]"
                    >
                      <div className="relative aspect-square">
                        {item.imagePath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imagePath}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-full flex-col items-center justify-center gap-1 px-2 text-center ${
                              TINT[item.category] ?? "bg-black/5 dark:bg-white/10"
                            }`}
                          >
                            <span className="text-2xl font-semibold leading-none">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide opacity-70">
                              {item.subtype}
                            </span>
                          </div>
                        )}
                        {isMatched && (
                          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-sm text-white shadow">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="truncate px-2 pt-1.5 text-sm font-medium">{item.name}</p>
                      <p className="truncate px-2 pb-1.5 text-xs text-black/50 dark:text-white/50">
                        {item.subtype}
                      </p>
                    </button>

                    {isMatched && (
                      <div className="flex items-center gap-1.5 border-t border-emerald-500/20 px-2 py-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-black/40 dark:text-white/40">
                          Strength
                        </span>
                        <div className="flex gap-1">
                          {Array.from({ length: DOTS }, (_, i) => {
                            const dot = i + 1;
                            const filled = dot <= dotsFilled(tier);
                            return (
                              <button
                                key={dot}
                                type="button"
                                title={STRENGTH_TITLE[tierForDot(dot)]}
                                aria-label={STRENGTH_TITLE[tierForDot(dot)]}
                                onClick={() => setStrength(item.id, tierForDot(dot))}
                                className={`h-3.5 w-3.5 rounded-full border transition ${
                                  filled
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-black/25 bg-transparent hover:border-emerald-500 dark:border-white/30"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
