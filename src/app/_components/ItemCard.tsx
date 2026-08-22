import Link from "next/link";
import type { ReactNode } from "react";

type CardItem = {
  id: string;
  name: string;
  imagePath: string | null;
  subtype: string;
  color?: string | null;
};

/** Shared square item card used by the closet and outfit views. */
export function ItemCard({
  item,
  href,
  subtitle,
  overlay,
  footer,
}: {
  item: CardItem;
  href?: string;
  subtitle?: string;
  overlay?: ReactNode; // top-right (e.g. favorite star)
  footer?: ReactNode; // bottom row (e.g. edit / delete)
}) {
  const link = href ?? `/items/${item.id}`;
  const sub = subtitle ?? `${item.subtype}${item.color ? ` · ${item.color}` : ""}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
      <div className="relative">
        <Link href={link} className="block aspect-square min-h-0 bg-black/5 dark:bg-white/10">
          {item.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-black/40 dark:text-white/40">
              No photo
            </div>
          )}
        </Link>
        {overlay ? <div className="absolute right-1.5 top-1.5">{overlay}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={link} className="truncate text-sm font-medium hover:underline">
          {item.name}
        </Link>
        <p className="truncate text-xs text-black/50 dark:text-white/50">{sub}</p>
        {footer ? <div className="mt-auto flex items-center justify-between pt-2">{footer}</div> : null}
      </div>
    </div>
  );
}
