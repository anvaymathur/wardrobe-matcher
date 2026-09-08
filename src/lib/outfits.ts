import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/currentUser";

/** All saved outfits, newest first, each with its items resolved. */
export async function getOutfits() {
  const userId = await requireUserId();
  return prisma.outfit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { item: true } } },
  });
}

export async function getOutfit(id: string) {
  const userId = await requireUserId();
  return prisma.outfit.findFirst({
    where: { id, userId },
    include: { items: { include: { item: true } } },
  });
}

export type OutfitWithItems = NonNullable<Awaited<ReturnType<typeof getOutfit>>>;
