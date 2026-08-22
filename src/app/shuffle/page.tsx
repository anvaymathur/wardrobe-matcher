import { getItems } from "@/lib/items";
import { getAllPairings } from "@/lib/pairings";
import { getActiveCollection } from "@/lib/collections";
import { Shuffler } from "@/app/_components/Shuffler";
import { CollectionBanner } from "@/app/_components/CollectionBanner";

export default async function ShufflePage() {
  const activeCollection = await getActiveCollection();
  const [items, pairings] = await Promise.all([
    getItems({ collectionId: activeCollection?.id ?? null }),
    getAllPairings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Shuffle</h1>
      <p className="mb-4 mt-1 text-sm text-black/60 dark:text-white/60">
        Get an outfit idea. Lock the pieces you like and reshuffle the rest.
      </p>
      {activeCollection && <CollectionBanner name={activeCollection.name} />}
      <Shuffler items={items} pairings={pairings} />
    </div>
  );
}
