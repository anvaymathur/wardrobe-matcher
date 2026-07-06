"use client";

import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/types";

type Item = { id: string; name: string; category: string; subtype: string };

const label = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

const selectClass =
  "w-full max-w-sm rounded-md border border-black/15 bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

export function OutfitPicker({
  items,
  selectedId,
}: {
  items: Item[];
  selectedId?: string;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Pick an item to build around"
      value={selectedId ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        router.push(id ? `/builder?itemId=${id}` : "/builder");
      }}
      className={selectClass}
    >
      <option value="">Choose an item…</option>
      {CATEGORIES.map((category) => {
        const group = items.filter((i) => i.category === category);
        if (group.length === 0) return null;
        return (
          <optgroup key={category} label={label(category)}>
            {group.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.subtype})
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
