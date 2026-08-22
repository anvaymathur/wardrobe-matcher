"use client";

import { deleteOutfit } from "@/lib/actions";

export function DeleteOutfitButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteOutfit}
      onSubmit={(e) => {
        if (!confirm(`Delete the outfit "${name}"?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded px-2 py-1.5 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
