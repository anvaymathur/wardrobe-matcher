"use client";

import { useState } from "react";

export type PickItem = {
  id: string;
  name: string;
  imagePath: string | null;
  subtype: string;
  category: string;
};

/** Tap-to-select grid of closet items; emits the chosen ids as hidden inputs
 * named "itemId" so a form action can read them via formData.getAll("itemId"). */
export function ItemMultiSelect({
  items,
  defaultSelected = [],
}: {
  items: PickItem[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

      <p className="mb-2 text-sm text-black/60 dark:text-white/60">
        {selected.size} selected
      </p>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const isSel = selected.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-pressed={isSel}
                className={`relative block w-full overflow-hidden rounded-lg border-2 transition-colors ${
                  isSel ? "border-foreground" : "border-transparent"
                }`}
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
                <span className="block truncate px-1.5 py-1 text-left text-[11px] leading-tight">
                  {item.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
