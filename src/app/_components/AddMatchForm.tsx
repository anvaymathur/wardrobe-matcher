"use client";

import { useFormStatus } from "react-dom";
import { createPairing } from "@/lib/actions";
import { MIN_TIER, MAX_TIER } from "@/lib/types";

type Candidate = { id: string; name: string; subtype: string };

const tiers = Array.from({ length: MAX_TIER - MIN_TIER + 1 }, (_, i) => MIN_TIER + i);
const tierLabel = (t: number) => (t === 1 ? "Tier 1 · best" : `Tier ${t}`);

const selectClass =
  "rounded-md border border-black/15 bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add match"}
    </button>
  );
}

export function AddMatchForm({
  itemId,
  candidates,
}: {
  itemId: string;
  candidates: Candidate[];
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        Nothing left to add — every item in another category is already matched (or
        you haven’t added any yet).
      </p>
    );
  }

  return (
    <form action={createPairing} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="itemId" value={itemId} />

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Pairs with
        <select name="otherId" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Choose an item…
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.subtype})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tier
        <select name="tier" defaultValue={MIN_TIER} className={selectClass}>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {tierLabel(t)}
            </option>
          ))}
        </select>
      </label>

      <SubmitButton />
    </form>
  );
}
