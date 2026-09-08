import Link from "next/link";
import { getItems } from "@/lib/items";
import { getActiveCollection } from "@/lib/collections";
import { createOutfit } from "@/lib/actions";
import { OutfitForm } from "@/app/_components/OutfitForm";
import { CollectionBanner } from "@/app/_components/CollectionBanner";

export default async function NewOutfitPage() {
  const activeCollection = await getActiveCollection();
  const items = await getItems({ collectionId: activeCollection?.id ?? null });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/outfits"
        className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to outfits
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">New outfit</h1>
      {activeCollection && <CollectionBanner name={activeCollection.name} />}
      <OutfitForm action={createOutfit} items={items} submitLabel="Save outfit" singlePerCategory />
    </div>
  );
}
