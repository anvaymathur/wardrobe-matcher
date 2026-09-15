"use client";

import { useState } from "react";
import { createOutfit } from "@/lib/actions";
import { AiOutfitSuggester } from "./AiOutfitSuggester";
import { OutfitForm } from "./OutfitForm";
import type { PickItem } from "./ItemMultiSelect";

/** New-outfit form with stylist ideas on top. Applying an idea remounts the
 * form (via `key`) with that outfit's name and items, which the user can still
 * tweak before saving. */
export function NewOutfitComposer({
  items,
  matches,
  initialItemIds = [],
}: {
  items: PickItem[];
  matches: Record<string, string[]>;
  initialItemIds?: string[];
}) {
  const [draft, setDraft] = useState({ version: 0, name: "", itemIds: initialItemIds });
  const [picks, setPicks] = useState(initialItemIds);

  return (
    <div className="flex flex-col gap-6">
      {items.length > 0 && (
        <AiOutfitSuggester
          items={items}
          anchorItemIds={picks}
          onUse={(idea) => {
            setDraft((d) => ({ version: d.version + 1, name: idea.name, itemIds: idea.itemIds }));
            setPicks(idea.itemIds);
          }}
        />
      )}
      <OutfitForm
        key={draft.version}
        action={createOutfit}
        items={items}
        defaults={{ name: draft.name, itemIds: draft.itemIds }}
        submitLabel="Save outfit"
        singlePerCategory
        matches={matches}
        onSelectionChange={setPicks}
      />
    </div>
  );
}
