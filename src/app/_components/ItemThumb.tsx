// Per-type tint for photo-less items, matching the rest of the app.
const TINT: Record<string, string> = {
  TOP: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50",
  BOTTOM: "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-50",
  OUTERWEAR: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50",
  SHOES: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-50",
};

export type ThumbItem = { name: string; imagePath: string | null; category: string };

/** Square item thumbnail: the photo, or a tinted tile showing the item's name
 * so a photo-less item is still recognizable. */
export function ItemThumb({
  item,
  size = "h-16 w-16",
  initialOnly = false,
}: {
  item: ThumbItem;
  size?: string;
  /** For tiny thumbnails where a name can't fit: show its first letter. */
  initialOnly?: boolean;
}) {
  return item.imagePath ? (
    <div className={`${size} shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imagePath} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  ) : (
    <span
      title={item.name}
      className={`${size} flex shrink-0 items-center justify-center rounded-lg p-1 text-center text-[10px] font-medium leading-tight ${
        TINT[item.category] ?? "bg-black/5 dark:bg-white/10"
      }`}
    >
      {initialOnly ? (
        <span className="text-xs font-semibold">{item.name.charAt(0).toUpperCase()}</span>
      ) : (
        <span className="line-clamp-3">{item.name}</span>
      )}
    </span>
  );
}
