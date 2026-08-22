"use client";

import { useRouter } from "next/navigation";

export function CollectionBanner({ name }: { name: string }) {
  const router = useRouter();
  const showAll = () => {
    document.cookie = "collection=all; path=/; max-age=31536000; samesite=lax";
    router.refresh();
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-sm dark:border-white/15 dark:bg-white/[0.05]">
      <span>
        Only <span className="font-medium">{name}</span>
      </span>
      <button
        type="button"
        onClick={showAll}
        className="rounded px-2 py-1 text-xs font-medium text-black/60 hover:text-foreground dark:text-white/60"
      >
        Show all ✕
      </button>
    </div>
  );
}
