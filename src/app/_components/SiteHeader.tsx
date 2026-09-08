"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Desktop-only top nav. On phones the bottom tab bar handles navigation, so
// the header is hidden (sm:block) to save space and avoid a cramped, hard-to-
// reach top row.
export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/signin") return null;

  return (
    <header className="hidden border-b border-black/10 sm:block dark:border-white/15">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-5 px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Wardrobe Matcher
        </Link>
        <nav className="flex items-center gap-1 text-sm text-black/60 dark:text-white/60">
          <Link href="/" className="rounded-md px-2 py-1.5 hover:text-foreground">
            Closet
          </Link>
          <Link href="/outfits" className="rounded-md px-2 py-1.5 hover:text-foreground">
            Outfits
          </Link>
          <Link href="/shuffle" className="rounded-md px-2 py-1.5 hover:text-foreground">
            Shuffle
          </Link>
          <Link href="/settings" className="rounded-md px-2 py-1.5 hover:text-foreground">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
