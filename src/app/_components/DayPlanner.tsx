"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { setPlannedDay } from "@/lib/actions";
import type { PickItem } from "./ItemMultiSelect";

export type PlanOutfit = { id: string; name: string; itemIds: string[] };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
    >
      {pending ? "Saving…" : "Save plan"}
    </button>
  );
}

/** Plan one day: optionally start from a saved outfit, then tap items to
 * fine-tune. Selected ids are submitted as hidden "itemId" inputs. */
export function DayPlanner({
  date,
  items,
  outfits,
  defaultSelected = [],
}: {
  date: string;
  items: PickItem[];
  outfits: PlanOutfit[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const itemIds = new Set(items.map((i) => i.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Start from a saved outfit: select exactly its items that still exist.
  const applyOutfit = (o: PlanOutfit) =>
    setSelected(new Set(o.itemIds.filter((id) => itemIds.has(id))));

  if (items.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        Add some items to your closet first.
      </p>
    );
  }

  return (
    <form action={setPlannedDay} className="flex flex-col gap-5">
      <input type="hidden" name="date" value={date} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="itemId" value={id} />
      ))}

      {outfits.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Start from a saved outfit</p>
          <div className="flex flex-wrap gap-2">
            {outfits.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => applyOutfit(o)}
                className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:border-foreground dark:border-white/20"
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Items</p>
          <div className="flex items-center gap-3 text-sm text-black/60 dark:text-white/60">
            <span>{selected.size} selected</span>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        </div>

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

      <div className="pt-1">
        <SaveButton />
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          Saving with nothing selected clears this day.
        </p>
      </div>
    </form>
  );
}
