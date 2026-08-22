"use client";

import { deleteItem } from "@/lib/actions";

export function DeleteItemButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteItem}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Delete ${name}`}
        className="-mr-1 rounded px-1 py-1 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Delete
      </button>
    </form>
  );
}
