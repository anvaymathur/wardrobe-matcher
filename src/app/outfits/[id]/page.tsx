import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutfit } from "@/lib/outfits";
import { ItemCard } from "@/app/_components/ItemCard";
import { DeleteOutfitButton } from "@/app/_components/DeleteOutfitButton";

const catLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();

export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const outfit = await getOutfit(id);
  if (!outfit) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/outfits"
        className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to outfits
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{outfit.name}</h1>
      <div className="mt-1 flex items-center gap-4">
        <Link
          href={`/outfits/${outfit.id}/edit`}
          className="rounded px-1 py-1 text-sm font-medium text-black/60 hover:underline dark:text-white/60"
        >
          Edit
        </Link>
        <DeleteOutfitButton id={outfit.id} name={outfit.name} />
      </div>
      {outfit.notes && (
        <p className="mt-2 text-sm text-black/70 dark:text-white/70">{outfit.notes}</p>
      )}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {outfit.items.map((oi) => (
          <li key={oi.id}>
            <ItemCard
              item={oi.item}
              subtitle={`${catLabel(oi.item.category)} · ${oi.item.subtype}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
