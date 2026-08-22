import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem } from "@/lib/items";
import { getPairingsForItem, getCandidateItems } from "@/lib/pairings";
import { MIN_TIER, MAX_TIER } from "@/lib/types";
import { AddMatchForm } from "@/app/_components/AddMatchForm";
import { RemoveMatchButton } from "@/app/_components/RemoveMatchButton";
import { FavoriteButton } from "@/app/_components/FavoriteButton";

const tierLabel = (t: number) => (t === 1 ? "Tier 1 · best match" : `Tier ${t}`);

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const [pairings, candidates] = await Promise.all([
    getPairingsForItem(id),
    getCandidateItems(item),
  ]);

  const tiers = Array.from({ length: MAX_TIER - MIN_TIER + 1 }, (_, i) => MIN_TIER + i);

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
        <h2 className="mb-3 text-lg font-semibold">Add a match</h2>
        <AddMatchForm itemId={item.id} candidates={candidates} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Matches</h2>
        {pairings.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No matches yet. Use “Add a match” above to pair this with another item.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {tiers.map((tier) => {
              const matches = pairings.filter((p) => p.tier === tier);
              if (matches.length === 0) return null;
              return (
                <div key={tier}>
                  <h3 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
                    {tierLabel(tier)}
                  </h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {matches.map(({ pairingId, item: other }) => (
                      <li
                        key={pairingId}
                        className="flex items-center gap-3 rounded-lg border border-black/10 p-2 dark:border-white/15"
                      >
                        <Link href={`/items/${other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-black/5 dark:bg-white/10">
                            {other.imagePath ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={other.imagePath} alt={other.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{other.name}</p>
                            <p className="truncate text-xs text-black/50 dark:text-white/50">{other.subtype}</p>
                          </div>
                        </Link>
                        <RemoveMatchButton pairingId={pairingId} itemId={item.id} otherName={other.name} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
