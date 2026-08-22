import Link from "next/link";
import { getItems } from "@/lib/items";
import { CategoryFilter } from "@/app/_components/CategoryFilter";
import { DeleteItemButton } from "@/app/_components/DeleteItemButton";

export default async function ClosetPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const items = await getItems(category);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Closet</h1>
        <Link
          href="/items/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          + Add item
        </Link>
      </div>

      <div className="mb-8">
        <CategoryFilter active={category} />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/15 px-6 py-16 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          {category
            ? "No items in this category yet."
            : "Your closet is empty. Add your first item to get started."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-lg border border-black/10 dark:border-white/15"
            >
              <Link href={`/items/${item.id}`} className="block aspect-square min-h-0 bg-black/5 dark:bg-white/10">
                {item.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imagePath}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-black/40 dark:text-white/40">
                    No photo
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <Link href={`/items/${item.id}`} className="truncate text-sm font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {item.subtype}
                  {item.color ? ` · ${item.color}` : ""}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <Link
                    href={`/items/${item.id}/edit`}
                    className="-ml-1 rounded px-1 py-1 text-sm font-medium text-black/60 hover:underline dark:text-white/60"
                  >
                    Edit
                  </Link>
                  <DeleteItemButton id={item.id} name={item.name} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
