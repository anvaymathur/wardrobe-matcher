import { prisma } from "@/lib/prisma";

/** All saved outfits, newest first, each with its items resolved. */
export async function getOutfits() {
  return prisma.outfit.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { item: true } } },
  });
}

export function getOutfit(id: string) {
  return prisma.outfit.findUnique({
    where: { id },
    include: { items: { include: { item: true } } },
  });
}

export type OutfitWithItems = NonNullable<Awaited<ReturnType<typeof getOutfit>>>;
