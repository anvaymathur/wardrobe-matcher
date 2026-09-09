"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { setPlannedDay } from "@/lib/actions";
import { ItemPickerGrid, applyToggle, type PickItem } from "./ItemPickerGrid";

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
  matches,
  plannedElsewhere,
}: {
  date: string;
  items: PickItem[];
  outfits: PlanOutfit[];
  defaultSelected?: string[];
  matches?: Record<string, string[]>;
  plannedElsewhere?: Record<string, string>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const itemIds = new Set(items.map((i) => i.id));

  // A day is a single outfit, so keep at most one item per clothing type.
  const toggle = (id: string) => setSelected((prev) => applyToggle(prev, id, items, true));

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
          <p className="text-sm font-medium">
            Items <span className="font-normal text-black/40 dark:text-white/40">· one per type</span>
          </p>
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

        <ItemPickerGrid
          items={items}
          selected={selected}
          onToggle={toggle}
          singlePerCategory
          matches={matches}
          plannedElsewhere={plannedElsewhere}
        />
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
