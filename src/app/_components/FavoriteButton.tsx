"use client";

import { toggleFavorite } from "@/lib/actions";

export function FavoriteButton({ id, favorite }: { id: string; favorite: boolean }) {
  return (
    <form action={toggleFavorite}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorite}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-base leading-none backdrop-blur transition hover:bg-black/60"
      >
        <span className={favorite ? "text-yellow-300" : "text-white/85"}>
          {favorite ? "★" : "☆"}
        </span>
      </button>
    </form>
  );
}
