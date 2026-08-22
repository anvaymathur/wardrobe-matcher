import Link from "next/link";
import { getItems } from "@/lib/items";
import { createCollection } from "@/lib/actions";
import { OutfitForm } from "@/app/_components/OutfitForm";

export default async function NewCollectionPage() {
  const items = await getItems(); // pick from the whole wardrobe

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/"
        className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to closet
      </Link>
      <h1 className="mb-1 mt-3 text-2xl font-semibold tracking-tight">New collection</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Pick the items to include — like everything you&rsquo;re packing for a trip.
      </p>
      <OutfitForm action={createCollection} items={items} submitLabel="Create collection" />
    </div>
  );
}
