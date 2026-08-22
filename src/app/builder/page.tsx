import Link from "next/link";
import { getItems, getItem } from "@/lib/items";
import { getPairingsForItem } from "@/lib/pairings";
import { MIN_TIER, MAX_TIER } from "@/lib/types";
import { OutfitPicker } from "@/app/_components/OutfitPicker";

const tierLabel = (t: number) => (t === 1 ? "Tier 1 · best match" : `Tier ${t}`);
const catLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string }>;
}) {
  const { itemId } = await searchParams;
  const items = await getItems();
  const selected = itemId ? await getItem(itemId) : null;
  const matches = selected ? await getPairingsForItem(selected.id) : [];

  const tiers = Array.from({ length: MAX_TIER - MIN_TIER + 1 }, (_, i) => MIN_TIER + i);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Outfit builder</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Pick an item to see everything it pairs with, best matches first.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-black/15 px-6 py-16 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          Add items to your closet first, then come back to build outfits.
        </p>
      ) : (
        <>
          <div className="mt-6">
            <OutfitPicker items={items} selectedId={selected?.id} />
          </div>

          {selected && (
            <div className="mt-8">
              <div className="flex items-center gap-5">
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
                  {selected.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imagePath}
                      alt={selected.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-black/40 dark:text-white/40">
                      No photo
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xl font-semibold">{selected.name}</p>
                  <p className="text-sm text-black/60 dark:text-white/60">
                    {catLabel(selected.category)} · {selected.subtype}
                  </p>
                </div>
              </div>

              <h2 className="mb-4 mt-8 text-lg font-semibold">Goes with</h2>
              {matches.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  No matches yet.{" "}
                  <Link href={`/items/${selected.id}`} className="font-medium underline">
                    Add some on the item’s page.
                  </Link>
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {tiers.map((tier) => {
                    const tierMatches = matches.filter((m) => m.tier === tier);
                    if (tierMatches.length === 0) return null;
                    return (
                      <div key={tier}>
                        <h3 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
                          {tierLabel(tier)}
                        </h3>
                        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                          {tierMatches.map(({ pairingId, item }) => (
                            <li
                              key={pairingId}
                              className="flex flex-col overflow-hidden rounded-lg border border-black/10 transition-colors hover:border-foreground dark:border-white/15"
                            >
                              <Link
                                href={`/items/${item.id}`}
                                className="block aspect-square min-h-0 bg-black/5 dark:bg-white/10"
                              >
                                {item.imagePath ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imagePath}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-black/40 dark:text-white/40">
                                    No photo
                                  </div>
                                )}
                              </Link>
                              <div className="flex flex-1 flex-col gap-1 p-3">
                                <Link
                                  href={`/items/${item.id}`}
                                  className="block truncate text-sm font-medium hover:underline"
                                >
                                  {item.name}
                                </Link>
                                <p className="truncate text-xs text-black/50 dark:text-white/50">
                                  {catLabel(item.category)} · {item.subtype}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
