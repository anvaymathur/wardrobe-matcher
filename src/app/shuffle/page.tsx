import { getItems } from "@/lib/items";
import { getAllPairings } from "@/lib/pairings";
import { Shuffler } from "@/app/_components/Shuffler";

export default async function ShufflePage() {
  const [items, pairings] = await Promise.all([getItems(), getAllPairings()]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Shuffle</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Get an outfit idea. Lock the pieces you like and reshuffle the rest.
      </p>
      <Shuffler items={items} pairings={pairings} />
    </div>
  );
}
