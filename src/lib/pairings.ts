import { prisma } from "@/lib/prisma";

/**
 * A pair is stored once (see the normalized order in `createPairing`), so an
 * item can appear as either side. This returns the *other* item for each of
 * an item's pairings, along with the tier and the pairing id.
 */
export async function getPairingsForItem(itemId: string) {
  const pairings = await prisma.pairing.findMany({
    where: { OR: [{ itemAId: itemId }, { itemBId: itemId }] },
    include: { itemA: true, itemB: true },
    orderBy: { tier: "asc" },
  });

  return pairings.map((p) => ({
    pairingId: p.id,
    tier: p.tier,
    item: p.itemAId === itemId ? p.itemB : p.itemA,
  }));
}

/**
 * Candidates for a new match: items in a *different* category (you pair a top
 * with a bottom, not another top) that aren't already matched with this item.
 */
export async function getCandidateItems(item: { id: string; category: string }) {
  const pairings = await prisma.pairing.findMany({
    where: { OR: [{ itemAId: item.id }, { itemBId: item.id }] },
    select: { itemAId: true, itemBId: true },
  });
  const alreadyMatched = pairings.map((p) =>
    p.itemAId === item.id ? p.itemBId : p.itemAId,
  );

  return prisma.item.findMany({
    where: {
      id: { notIn: [item.id, ...alreadyMatched] },
      category: { not: item.category },
    },
    orderBy: { name: "asc" },
  });
}
