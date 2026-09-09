import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem } from "@/lib/items";
import { getMatchEditorData } from "@/lib/pairings";
import { MatchEditor } from "@/app/_components/MatchEditor";
import { FavoriteButton } from "@/app/_components/FavoriteButton";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const { others, matched } = await getMatchEditorData(item);
  const matchCount = Object.keys(matched).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/" className="inline-block py-1 text-sm text-black/50 hover:underline dark:text-white/50">
        ← Back to closet
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10">
          {item.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imagePath} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-black/40 dark:text-white/40">
              No photo
            </div>
          )}
          <div className="absolute right-2 top-2">
            <FavoriteButton id={item.id} favorite={item.favorite} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            {item.category.charAt(0) + item.category.slice(1).toLowerCase()} · {item.subtype}
            {item.color ? ` · ${item.color}` : ""}
          </p>
          {item.notes && <p className="mt-2 text-sm text-black/70 dark:text-white/70">{item.notes}</p>}
          <Link
            href={`/items/${item.id}/edit`}
            className="mt-3 w-fit text-sm font-medium text-black/60 hover:underline dark:text-white/60"
          >
            Edit item
          </Link>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Matches</h2>
          {matchCount > 0 && (
            <span className="text-sm text-black/45 dark:text-white/45">
              {matchCount} paired
            </span>
          )}
        </div>
        <MatchEditor itemId={item.id} others={others} initialMatched={matched} />
      </section>
    </div>
  );
}
