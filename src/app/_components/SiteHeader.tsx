"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";

export function SiteHeader({ gated }: { gated: boolean }) {
  const pathname = usePathname();

  // No chrome on the login screen.
  if (pathname === "/login") return null;

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-x-3 gap-y-1 px-4 py-3 sm:gap-x-5 sm:px-6 sm:py-4">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight">
          Wardrobe Matcher
        </Link>
        <nav className="flex items-center gap-1 text-sm text-black/60 dark:text-white/60">
          <Link href="/" className="rounded-md px-2 py-1.5 hover:text-foreground">
            Closet
          </Link>
          <Link href="/builder" className="rounded-md px-2 py-1.5 hover:text-foreground">
            Builder
          </Link>
        </nav>
        {gated && (
          <form action={logout} className="ml-auto">
            <button
              type="submit"
              className="rounded-md px-2 py-1.5 text-sm text-black/60 hover:text-foreground dark:text-white/60"
            >
              Log out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
