import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection } from "@/lib/collections";
import { getItems } from "@/lib/items";
import { updateCollection } from "@/lib/actions";
import { OutfitForm } from "@/app/_components/OutfitForm";
import { DeleteCollectionButton } from "@/app/_components/DeleteCollectionButton";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [collection, items] = await Promise.all([getCollection(id), getItems()]);
  if (!collection) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/"
        className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to closet
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">Edit collection</h1>

      <OutfitForm
        action={updateCollection}
        items={items}
        defaults={{
          id: collection.id,
          name: collection.name,
          itemIds: collection.items.map((ci) => ci.itemId),
        }}
        submitLabel="Save changes"
      />

      <div className="mt-8 border-t border-black/10 pt-4 dark:border-white/15">
        <DeleteCollectionButton id={collection.id} name={collection.name} />
      </div>
    </div>
  );
}
