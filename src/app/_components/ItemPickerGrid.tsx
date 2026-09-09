"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/types";

export type PickItem = {
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

/** Toggle `id` in `selected`. With `singlePerCategory`, picking an item first
 * drops any other pick in the same category, so you keep at most one per type
 * (tap the current pick again to clear it). */
export function applyToggle(
  selected: Set<string>,
  id: string,
  items: PickItem[],
  singlePerCategory: boolean,
): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) {
    next.delete(id);
    return next;
  }
  if (singlePerCategory) {
    const category = items.find((i) => i.id === id)?.category;
    if (category) {
      for (const other of items) {
        if (other.category === category && next.has(other.id)) next.delete(other.id);
      }
    }
  }
  next.add(id);
  return next;
}

/** Grid of closet items grouped by clothing type.
 * - `singlePerCategory`: keep at most one pick per type (others dim to show the pick).
 * - `matches`: highlight items that pair with everything already chosen.
 * - `plannedElsewhere`: badge items already planned other days this week.
 * - `blocked` + `onToggleBlock`: right-click / long-press an item to flag it
 *   "don't repeat this week"; flagged items already planned elsewhere are faded. */
export function ItemPickerGrid({
  items,
  selected,
  onToggle,
  singlePerCategory = false,
  matches,
  plannedElsewhere,
  blocked,
  onToggleBlock,
}: {
  items: PickItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  singlePerCategory?: boolean;
  matches?: Record<string, string[]>;
  /** itemId → the day labels (e.g. ["Tue"]) it's already planned on this week. */
  plannedElsewhere?: Record<string, string[]>;
  /** itemIds flagged "don't repeat" for this week. */
  blocked?: Set<string>;
  onToggleBlock?: (id: string) => void;
}) {
  const selectedItems = items.filter((i) => selected.has(i.id));
  const pickedCategories = new Set(selectedItems.map((i) => i.category));

  // "Blocked" = flagged for this week AND already planned another day (so the
  // fade always has a visible reason — the day badge).
  const isBlocked = (id: string) =>
    Boolean(blocked?.has(id)) && Boolean(plannedElsewhere?.[id]?.length);

  // An item is "recommended" when it pairs with every already-chosen item in a
  // different type. Blocked items are skipped so they read as unavailable.
  const recommended = new Set<string>();
  if (matches) {
    for (const item of items) {
      if (selected.has(item.id) || isBlocked(item.id)) continue;
      const others = selectedItems.filter((s) => s.category !== item.category);
      if (others.length === 0) continue;
      const paired = matches[item.id] ?? [];
      if (others.every((s) => paired.includes(s.id))) recommended.add(item.id);
    }
  }

  const groups = CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABEL[category] ?? category,
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  // Right-click / long-press menu to flag "don't repeat this week".
  const [menu, setMenu] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const openMenu = (item: PickItem, x: number, y: number) => {
    // Keep the menu on-screen.
    setMenu({ id: item.id, name: item.name, x: Math.min(x, window.innerWidth - 200), y });
  };

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div className="flex flex-col gap-5">
      {matches && selectedItems.length > 0 && recommended.size > 0 && (
        <p className="-mb-2 text-xs text-emerald-600 dark:text-emerald-400">
          Outlined items match everything you’ve picked.
        </p>
      )}
      {plannedElsewhere && Object.keys(plannedElsewhere).length > 0 && (
        <p className="-mb-2 text-xs text-black/45 dark:text-white/45">
          Day badges show items already planned this week.
          {onToggleBlock && " Right-click or long-press an item to stop it repeating that week."}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.category}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45 dark:text-white/45">
            {group.label}
          </p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.items.map((item) => {
              const isSel = selected.has(item.id);
              const plannedDays = !isSel ? plannedElsewhere?.[item.id] : undefined;
              const plannedLabel =
                plannedDays && plannedDays.length > 0
                  ? plannedDays.length <= 2
                    ? plannedDays.join(", ")
                    : `${plannedDays[0]} +${plannedDays.length - 1}`
                  : undefined;
              const isFlagged = Boolean(blocked?.has(item.id));
              const isBlk = isFlagged && Boolean(plannedLabel);
              const dimmed =
                (singlePerCategory && !isSel && pickedCategories.has(item.category)) || isBlk;
              const isMatch = !isSel && !dimmed && recommended.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (longPressed.current) {
                        longPressed.current = false;
                        return; // this tap was a long-press; don't toggle selection
                      }
                      onToggle(item.id);
                    }}
                    onContextMenu={
                      onToggleBlock
                        ? (e) => {
                            e.preventDefault();
                            openMenu(item, e.clientX, e.clientY);
                          }
                        : undefined
                    }
                    onTouchStart={
                      onToggleBlock
                        ? (e) => {
                            const t = e.touches[0];
                            const x = t.clientX;
                            const y = t.clientY;
                            longPressed.current = false;
                            cancelPress();
                            pressTimer.current = setTimeout(() => {
                              longPressed.current = true;
                              openMenu(item, x, y);
                            }, 450);
                          }
                        : undefined
                    }
                    onTouchMove={onToggleBlock ? cancelPress : undefined}
                    onTouchEnd={onToggleBlock ? cancelPress : undefined}
                    aria-pressed={isSel}
                    className={`relative block w-full select-none overflow-hidden rounded-lg border-2 transition [-webkit-touch-callout:none] ${
                      isSel
                        ? "border-foreground"
                        : isBlk
                          ? "border-amber-500"
                          : isMatch
                            ? "border-emerald-500"
                            : "border-transparent"
                    } ${dimmed ? "opacity-40" : ""}`}
                  >
                    <div className="aspect-square bg-black/5 dark:bg-white/10">
                      {item.imagePath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-black/40 dark:text-white/40">
                          No photo
                        </div>
                      )}
                    </div>
                    {isSel && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs text-background">
                        ✓
                      </span>
                    )}
                    {plannedLabel ? (
                      <span
                        className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-white ${
                          isBlk ? "bg-amber-500" : "bg-black/60 dark:bg-white/70 dark:text-black"
                        }`}
                      >
                        {plannedLabel}
                      </span>
                    ) : isMatch ? (
                      <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-white">
                        match
                      </span>
                    ) : isFlagged ? (
                      <span className="absolute left-1 top-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-white">
                        1×/wk
                      </span>
                    ) : null}
                    <span className="block truncate px-1.5 py-1 text-left text-[11px] leading-tight">
                      {item.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {menu && onToggleBlock && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-48 overflow-hidden rounded-lg border border-black/15 bg-background text-sm shadow-lg dark:border-white/20"
            style={{ top: menu.y, left: menu.x }}
          >
            <p className="truncate border-b border-black/10 px-3 py-2 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
              {menu.name}
            </p>
            <button
              type="button"
              onClick={() => {
                onToggleBlock(menu.id);
                setMenu(null);
              }}
              className="block w-full px-3 py-2.5 text-left font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              {blocked?.has(menu.id) ? "Allow repeating this week" : "Don’t repeat this week"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
