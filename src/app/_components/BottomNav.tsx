"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Closet", icon: "👕", active: (p: string) => p === "/" || p.startsWith("/items") },
  { href: "/week", label: "Week", icon: "📅", active: (p: string) => p.startsWith("/week") },
  { href: "/outfits", label: "Outfits", icon: "🧥", active: (p: string) => p.startsWith("/outfits") },
  { href: "/shuffle", label: "Shuffle", icon: "🎲", active: (p: string) => p.startsWith("/shuffle") || p.startsWith("/builder") },
  { href: "/settings", label: "Settings", icon: "⚙️", active: (p: string) => p.startsWith("/settings") },
];

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/signin") return null;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-white/15">
        <div className="flex items-stretch">
          {tabs.map((t) => {
            const isActive = t.active(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-xs font-medium ${
                  isActive ? "text-foreground" : "text-black/50 dark:text-white/50"
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Thumb-reachable add button (mobile only), sitting above the tab bar. */}
      <Link
        href="/items/new"
        aria-label="Add item"
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-3xl leading-none text-background shadow-lg sm:hidden"
      >
        +
      </Link>
    </>
  );
}
