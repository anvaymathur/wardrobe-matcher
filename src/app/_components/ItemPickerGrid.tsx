"use client";

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

/** Grid of closet items grouped by clothing type. When `singlePerCategory`, the
 * unchosen items in a type that already has a pick are dimmed to show the pick;
 * tapping any of them switches the pick, tapping the pick clears it. When
 * `matches` is given, items that pair with everything already chosen (in other
 * types) are highlighted, surfacing the closet's saved matches while building. */
export function ItemPickerGrid({
  items,
  selected,
  onToggle,
  singlePerCategory = false,
  matches,
}: {
  items: PickItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  singlePerCategory?: boolean;
  matches?: Record<string, string[]>;
}) {
  const selectedItems = items.filter((i) => selected.has(i.id));

  // Which categories already have a pick (for the dimming cue).
  const pickedCategories = new Set(selectedItems.map((i) => i.category));

  // An item is "recommended" when it pairs with every already-chosen item in a
  // different type — so as you pick, only mutually-matching items stay lit.
  const recommended = new Set<string>();
  if (matches) {
    for (const item of items) {
      if (selected.has(item.id)) continue;
      const others = selectedItems.filter((s) => s.category !== item.category);
      if (others.length === 0) continue;
      const paired = matches[item.id] ?? [];
      if (others.every((s) => paired.includes(s.id))) recommended.add(item.id);
    }
  }

  // Keep the fixed category order; only render types you actually own.
  const groups = CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_LABEL[category] ?? category,
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {matches && selectedItems.length > 0 && recommended.size > 0 && (
        <p className="-mb-2 text-xs text-emerald-600 dark:text-emerald-400">
          Outlined items match everything you’ve picked.
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
              const dimmed = singlePerCategory && !isSel && pickedCategories.has(item.category);
              const isMatch = !isSel && !dimmed && recommended.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(item.id)}
                    aria-pressed={isSel}
                    className={`relative block w-full overflow-hidden rounded-lg border-2 transition ${
                      isSel
                        ? "border-foreground"
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
                    {isMatch && (
                      <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-white">
                        match
                      </span>
                    )}
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
    </div>
  );
}
