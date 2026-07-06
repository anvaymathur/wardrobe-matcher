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
      <div className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Wardrobe Matcher
        </Link>
        <nav className="flex gap-4 text-sm text-black/60 dark:text-white/60">
          <Link href="/" className="hover:text-foreground">
            Closet
          </Link>
          <Link href="/builder" className="hover:text-foreground">
            Outfit builder
          </Link>
        </nav>
        {gated && (
          <form action={logout} className="ml-auto">
            <button
              type="submit"
              className="text-sm text-black/60 hover:text-foreground dark:text-white/60"
            >
              Log out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
