import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { getItems, getUnpairedCount } from "@/lib/items";
import { ClosetControls } from "@/app/_components/ClosetControls";
import { ItemCard } from "@/app/_components/ItemCard";
import { FavoriteButton } from "@/app/_components/FavoriteButton";
import { DeleteItemButton } from "@/app/_components/DeleteItemButton";
import { SwipeableItemCard, type SwipeAction } from "@/app/_components/SwipeableItemCard";

const SWIPE_ACTIONS = new Set(["none", "favorite", "edit", "delete"]);
const asAction = (v: string | undefined, fallback: SwipeAction): SwipeAction =>
  v && SWIPE_ACTIONS.has(v) ? (v as SwipeAction) : fallback;

export default async function ClosetPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    sort?: string;
    favorite?: string;
    unpaired?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters = {
    category: sp.category,
    q: sp.q,
    sort: sp.sort,
    favorite: sp.favorite === "1",
    unpaired: sp.unpaired === "1",
  };

  const [items, unpairedCount, jar] = await Promise.all([
    getItems(filters),
    getUnpairedCount(),
    cookies(),
  ]);
  const filtering = Boolean(sp.category || sp.q || sp.favorite || sp.unpaired);
  const swipeLeft = asAction(jar.get("swipeLeft")?.value, "none");
  const swipeRight = asAction(jar.get("swipeRight")?.value, "favorite");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Closet</h1>
        <Link
          href="/items/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          + Add item
        </Link>
      </div>

      <div className="mb-6">
        <Suspense fallback={<div className="h-24" />}>
          <ClosetControls unpairedCount={unpairedCount} />
        </Suspense>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 px-6 py-16 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          {filtering
            ? "No items match these filters."
            : "Your closet is empty. Add your first item to get started."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <SwipeableItemCard
                id={item.id}
                name={item.name}
                leftAction={swipeLeft}
                rightAction={swipeRight}
              >
                <ItemCard
                  item={item}
                  overlay={<FavoriteButton id={item.id} favorite={item.favorite} />}
                  footer={
                    <>
                      <Link
                        href={`/items/${item.id}/edit`}
                        className="-ml-1 rounded px-1 py-1 text-sm font-medium text-black/60 hover:underline dark:text-white/60"
                      >
                        Edit
                      </Link>
                      <DeleteItemButton id={item.id} name={item.name} />
                    </>
                  }
                />
              </SwipeableItemCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
