import { prisma } from "@/lib/prisma";
import { isCategory } from "@/lib/types";
import { requireUserId } from "@/lib/currentUser";
import type { Prisma } from "@/generated/prisma/client";

export type ItemFilters = {
  category?: string;
  q?: string;
  sort?: string; // "newest" (default) | "name" | "most-paired"
  favorite?: boolean;
  unpaired?: boolean;
  collectionId?: string | null; // scope to a collection's items
};

/** Items for the closet, with optional search / filters / sort. */
export async function getItems(filters: ItemFilters = {}) {
  const { category, q, sort, favorite, unpaired, collectionId } = filters;

  const where: Prisma.ItemWhereInput = { userId: await requireUserId() };
  if (isCategory(category)) where.category = category;
  if (collectionId) where.collections = { some: { collectionId } };
  if (favorite) where.favorite = true;
  if (unpaired) {
    where.pairingsA = { none: {} };
    where.pairingsB = { none: {} };
  }
  const term = q?.trim();
  if (term) {
    // SQLite LIKE is case-insensitive for ASCII, which is fine here.
    where.OR = [
      { name: { contains: term } },
      { subtype: { contains: term } },
      { color: { contains: term } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: sort === "name" ? { name: "asc" } : { createdAt: "desc" },
    include: { _count: { select: { pairingsA: true, pairingsB: true } } },
  });

  if (sort === "most-paired") {
    const count = (i: (typeof items)[number]) => i._count.pairingsA + i._count.pairingsB;
    return [...items].sort((a, b) => count(b) - count(a) || a.name.localeCompare(b.name));
  }
  return items;
}

export type ClosetItem = Awaited<ReturnType<typeof getItems>>[number];

export async function getItem(id: string) {
  const userId = await requireUserId();
  return prisma.item.findFirst({ where: { id, userId } });
}

/** How many items have no pairings at all — used for the "Unpaired" nudge. */
export async function getUnpairedCount() {
  const userId = await requireUserId();
  return prisma.item.count({
    where: { userId, pairingsA: { none: {} }, pairingsB: { none: {} } },
  });
}
