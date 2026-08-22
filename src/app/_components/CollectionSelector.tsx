"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Col = { id: string; name: string };

const setActive = (v: string) => {
  document.cookie = `collection=${v}; path=/; max-age=31536000; samesite=lax`;
};

export function CollectionSelector({
  collections,
  activeId,
}: {
  collections: Col[];
  activeId: string | null;
}) {
  const router = useRouter();
  const select = (v: string) => {
    setActive(v);
    router.refresh();
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active
        ? "border-foreground bg-foreground text-background"
        : "border-black/15 hover:border-foreground dark:border-white/20"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => select("all")} className={chip(!activeId)}>
        All
      </button>
      {collections.map((c) => (
        <button key={c.id} type="button" onClick={() => select(c.id)} className={chip(activeId === c.id)}>
          {c.name}
        </button>
      ))}
      <Link
        href="/collections/new"
        className="rounded-full border border-dashed border-black/25 px-3.5 py-1.5 text-sm text-black/60 hover:border-foreground hover:text-foreground dark:border-white/30 dark:text-white/60"
      >
        + New
      </Link>
      {activeId && (
        <Link
          href={`/collections/${activeId}/edit`}
          className="rounded-full px-3 py-1.5 text-sm text-black/50 hover:text-foreground dark:text-white/50"
        >
          Edit
        </Link>
      )}
    </div>
  );
}
