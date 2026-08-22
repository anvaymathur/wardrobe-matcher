"use client";

import { deletePairing } from "@/lib/actions";

export function RemoveMatchButton({
  pairingId,
  itemId,
  otherName,
}: {
  pairingId: string;
  itemId: string;
  otherName: string;
}) {
  return (
    <form
      action={deletePairing}
      onSubmit={(e) => {
        if (!confirm(`Remove the match with "${otherName}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="pairingId" value={pairingId} />
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        aria-label={`Remove match with ${otherName}`}
        className="rounded px-2 py-1.5 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Remove
      </button>
    </form>
  );
}
