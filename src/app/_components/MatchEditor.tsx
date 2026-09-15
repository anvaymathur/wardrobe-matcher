"use client";

import { useState, useTransition } from "react";
import { createPairing, unpairItems } from "@/lib/actions";
import { suggestMatches } from "@/lib/aiActions";
import type { MatchSuggestion } from "@/lib/ai/suggestMatches";
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

// Match strength ↔ tier. Tier 1 is the best match and is given the most weight
// when the stylist reads your taste. Shown as filled dots (3 = best), no jargon.
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

  // ── Stylist suggestions (on demand) ──
  const [suggestions, setSuggestions] = useState<MatchSuggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const askStylist = async () => {
    setSuggesting(true);
    setAiError(null);
    const result = await suggestMatches(itemId);
    setSuggesting(false);
    if (result.ok) setSuggestions(result.data);
    else setAiError(result.error);
  };

  const acceptSuggestion = (s: MatchSuggestion) => setStrength(s.itemId, s.strength);
  const acceptAll = () => suggestions?.filter((s) => !(s.itemId in matched)).forEach(acceptSuggestion);

  const byId = new Map(others.map((o) => [o.id, o]));
  const suggestedIds = new Set(suggestions?.map((s) => s.itemId));

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
        well they go together — stronger matches are favored in suggestions.
        {matchCount > 0 && (
          <span className="ml-1 font-medium text-foreground">
            {matchCount} matched.
          </span>
        )}
      </p>

      <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">✨ Stylist picks</p>
          <div className="flex items-center gap-3">
            {suggestions && suggestions.some((s) => !(s.itemId in matched)) && (
              <button
                type="button"
                onClick={acceptAll}
                className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                Add all
              </button>
            )}
            <button
              type="button"
              onClick={askStylist}
              disabled={suggesting}
              className="rounded-full bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {suggesting ? "Thinking…" : suggestions ? "Ask again" : "Suggest matches"}
            </button>
          </div>
        </div>

        {aiError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{aiError}</p>}

        {!suggestions && !aiError && (
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Get ideas for what goes with this, based on its type, color, description and photo.
          </p>
        )}

        {suggestions?.length === 0 && (
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Nothing new stood out — try adding a description or photo to your items for better ideas.
          </p>
        )}

        {suggestions && suggestions.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {suggestions.map((s) => {
              const other = byId.get(s.itemId);
              if (!other) return null;
              const added = s.itemId in matched;
              return (
                <li key={s.itemId} className="flex items-center gap-3 rounded-lg bg-background/70 p-2">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md">
                    {other.imagePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={other.imagePath} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className={`flex h-full items-center justify-center text-lg font-semibold ${
                          TINT[other.category] ?? "bg-black/5 dark:bg-white/10"
                        }`}
                      >
                        {other.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{other.name}</p>
                    <p className="text-xs leading-snug text-black/55 dark:text-white/55">{s.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptSuggestion(s)}
                    disabled={added}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      added
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {added ? "Added ✓" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
                        {!isMatched && suggestedIds.has(item.id) && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                            ✨ Pick
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
