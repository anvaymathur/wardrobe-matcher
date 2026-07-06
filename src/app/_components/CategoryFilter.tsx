import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

const label = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

/** Category filter as a row of links that set ?category=… on the closet. */
export function CategoryFilter({ active }: { active?: string }) {
  const options = [{ value: "", text: "All" }, ...CATEGORIES.map((c) => ({ value: c, text: label(c) }))];

  return (
    <nav className="flex flex-wrap gap-2">
      {options.map(({ value, text }) => {
        const isActive = value === (active ?? "");
        return (
          <Link
            key={value || "all"}
            href={value ? `/?category=${value}` : "/"}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-black/15 hover:border-foreground dark:border-white/20"
            }`}
          >
            {text}
          </Link>
        );
      })}
    </nav>
  );
}
