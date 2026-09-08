"use client";

import { useState } from "react";
import { ItemPickerGrid, applyToggle, type PickItem } from "./ItemPickerGrid";

export type { PickItem };

/** Tap-to-select grid of closet items, grouped by type; emits the chosen ids as
 * hidden inputs named "itemId" so a form action can read them via
 * formData.getAll("itemId"). With `singlePerCategory`, at most one item per type. */
export function ItemMultiSelect({
  items,
  defaultSelected = [],
  singlePerCategory = false,
}: {
  items: PickItem[];
  defaultSelected?: string[];
  singlePerCategory?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  const toggle = (id: string) =>
    setSelected((prev) => applyToggle(prev, id, items, singlePerCategory));

  if (items.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        Add some items to your closet first.
      </p>
    );
  }

  return (
    <div>
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="itemId" value={id} />
      ))}

      <p className="mb-3 text-sm text-black/60 dark:text-white/60">
        {selected.size} selected
        {singlePerCategory && <span className="text-black/40 dark:text-white/40"> · one per type</span>}
      </p>

      <ItemPickerGrid
        items={items}
        selected={selected}
        onToggle={toggle}
        singlePerCategory={singlePerCategory}
      />
    </div>
  );
}
