"use client";

import { useState } from "react";
import { suggestOutfits } from "@/lib/aiActions";
import type { OutfitSuggestion } from "@/lib/ai/suggestOutfits";
import { ItemThumb, type ThumbItem } from "./ItemThumb";

/** "Outfit ideas" panel: an optional brief plus the current picks go to the
 * stylist, which answers with a few complete outfits to apply in one tap. */
export function AiOutfitSuggester({
  items,
  anchorItemIds,
  onUse,
}: {
  items: (ThumbItem & { id: string })[];
  /** Items already picked; every idea is built around them. */
  anchorItemIds: string[];
  onUse: (outfit: OutfitSuggestion) => void;
}) {
  const [brief, setBrief] = useState("");
  const [ideas, setIdeas] = useState<OutfitSuggestion[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedKey, setUsedKey] = useState<string | null>(null);

  const byId = new Map(items.map((i) => [i.id, i]));
  const anchorCount = anchorItemIds.filter((id) => byId.has(id)).length;

  const ask = async () => {
    setPending(true);
    setError(null);
    setUsedKey(null);
    const result = await suggestOutfits({ brief, anchorItemIds });
    setPending(false);
    if (result.ok) setIdeas(result.data);
    else setError(result.error);
  };

  return (
    <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
      <p className="text-sm font-medium">✨ Outfit ideas</p>
      <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
        {anchorCount > 0
          ? `Built around your ${anchorCount} pick${anchorCount === 1 ? "" : "s"}.`
          : "Pick an item below first to build around it, or just ask."}
      </p>

      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) void ask();
        }}
      >
        <input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={200}
          placeholder="Occasion or vibe — e.g. rainy office day"
          className="min-w-0 flex-1 rounded-full border border-black/15 bg-background px-3.5 py-2 text-base outline-none placeholder:text-black/35 focus:border-violet-500 sm:text-sm dark:border-white/20 dark:placeholder:text-white/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Thinking…" : ideas ? "Again" : "Suggest"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {ideas?.length === 0 && (
        <p className="mt-2 text-sm text-black/55 dark:text-white/55">
          No complete outfits came out of that — try a different brief or add a few more items.
        </p>
      )}

      {ideas && ideas.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {ideas.map((idea) => {
            const key = idea.itemIds.join(",");
            const used = usedKey === key;
            return (
              <li key={key} className="rounded-lg bg-background/70 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{idea.name}</p>
                    <p className="text-xs leading-snug text-black/55 dark:text-white/55">{idea.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUsedKey(key);
                      onUse(idea);
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      used
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {used ? "Applied ✓" : "Use this"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {idea.itemIds.map((id) => {
                    const item = byId.get(id);
                    return item ? <ItemThumb key={id} item={item} size="h-14 w-14" /> : null;
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
