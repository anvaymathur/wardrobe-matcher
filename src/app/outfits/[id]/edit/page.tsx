import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutfit } from "@/lib/outfits";
import { getItems } from "@/lib/items";
import { getMatchMap } from "@/lib/pairings";
import { updateOutfit } from "@/lib/actions";
import { OutfitForm } from "@/app/_components/OutfitForm";

export default async function EditOutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [outfit, items, matches] = await Promise.all([getOutfit(id), getItems(), getMatchMap()]);
  if (!outfit) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={`/outfits/${outfit.id}`}
        className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to outfit
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-semibold tracking-tight">Edit outfit</h1>
      <OutfitForm
        action={updateOutfit}
        items={items}
        defaults={{
          id: outfit.id,
          name: outfit.name,
          notes: outfit.notes,
          itemIds: outfit.items.map((oi) => oi.itemId),
        }}
        submitLabel="Save changes"
        singlePerCategory
        matches={matches}
      />
    </div>
  );
}
