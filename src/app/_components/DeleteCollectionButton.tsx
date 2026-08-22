"use client";

import { deleteCollection } from "@/lib/actions";

export function DeleteCollectionButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteCollection}
      onSubmit={(e) => {
        if (!confirm(`Delete the collection "${name}"? Your items stay in your closet.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded px-2 py-1.5 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Delete collection
      </button>
    </form>
  );
}
