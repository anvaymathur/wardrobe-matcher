import Link from "next/link";
import { getOutfits } from "@/lib/outfits";

function OutfitCollage({ images }: { images: (string | null)[] }) {
  const imgs = images.slice(0, 4);
  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-px bg-black/10 dark:bg-white/15">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden bg-black/5 dark:bg-white/10">
          {imgs[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgs[i]!} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function OutfitsPage() {
  const outfits = await getOutfits();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Outfits</h1>
        <Link
          href="/outfits/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          + New outfit
        </Link>
      </div>

      {outfits.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 px-6 py-16 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          No outfits yet. Tap “New outfit” to combine items from your closet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {outfits.map((outfit) => (
            <li
              key={outfit.id}
              className="overflow-hidden rounded-lg border border-black/10 dark:border-white/15"
            >
              <Link href={`/outfits/${outfit.id}`} className="block">
                <OutfitCollage images={outfit.items.map((oi) => oi.item.imagePath)} />
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{outfit.name}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {outfit.items.length} item{outfit.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
