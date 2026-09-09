import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/currentUser";

/**
 * A pair is stored once (see the normalized order in `createPairing`), so an
 * item can appear as either side. This returns the *other* item for each of
 * an item's pairings, along with the tier and the pairing id.
 */
export async function getPairingsForItem(itemId: string) {
  const userId = await requireUserId();
  const pairings = await prisma.pairing.findMany({
    where: { userId, OR: [{ itemAId: itemId }, { itemBId: itemId }] },
    include: { itemA: true, itemB: true },
    orderBy: { tier: "asc" },
  });

  return pairings.map((p) => ({
    pairingId: p.id,
    tier: p.tier,
    item: p.itemAId === itemId ? p.itemB : p.itemA,
  }));
}

/** Every pairing as flat {itemAId, itemBId, tier} rows — used by the shuffler. */
export async function getAllPairings() {
  const userId = await requireUserId();
  return prisma.pairing.findMany({
    where: { userId },
    select: { itemAId: true, itemBId: true, tier: true },
  });
}

/**
 * Adjacency map of every match: itemId → the ids it's paired with. Used by the
 * outfit/planner pickers to highlight items that go with what's already chosen.
 */
export async function getMatchMap(): Promise<Record<string, string[]>> {
  const userId = await requireUserId();
  const pairings = await prisma.pairing.findMany({
    where: { userId },
    select: { itemAId: true, itemBId: true },
  });
  const map: Record<string, string[]> = {};
  for (const { itemAId, itemBId } of pairings) {
    (map[itemAId] ??= []).push(itemBId);
    (map[itemBId] ??= []).push(itemAId);
  }
  return map;
}

/**
 * Everything the match editor needs for one item: every cross-category item
 * (you pair a top with a bottom, not another top) plus which of them are
 * already matched and at what tier. The editor shows all of them as a
 * tap-to-toggle grid, so — unlike `getCandidateItems` — matched items are
 * included here rather than filtered out.
 */
export async function getMatchEditorData(item: { id: string; category: string }) {
  const userId = await requireUserId();
  const [others, pairings] = await Promise.all([
    prisma.item.findMany({
      where: { userId, id: { not: item.id }, category: { not: item.category } },
      orderBy: { name: "asc" },
    }),
    prisma.pairing.findMany({
      where: { userId, OR: [{ itemAId: item.id }, { itemBId: item.id }] },
      select: { itemAId: true, itemBId: true, tier: true },
    }),
  ]);

  const matched: Record<string, number> = {};
  for (const p of pairings) {
    const otherId = p.itemAId === item.id ? p.itemBId : p.itemAId;
    matched[otherId] = p.tier;
  }
  return { others, matched };
}

/**
 * Candidates for a new match: items in a *different* category (you pair a top
 * with a bottom, not another top) that aren't already matched with this item.
 */
export async function getCandidateItems(item: { id: string; category: string }) {
  const userId = await requireUserId();
  const pairings = await prisma.pairing.findMany({
    where: { userId, OR: [{ itemAId: item.id }, { itemBId: item.id }] },
    select: { itemAId: true, itemBId: true },
  });
  const alreadyMatched = pairings.map((p) =>
    p.itemAId === item.id ? p.itemBId : p.itemAId,
  );

  return prisma.item.findMany({
    where: {
      userId,
      id: { notIn: [item.id, ...alreadyMatched] },
      category: { not: item.category },
    },
    orderBy: { name: "asc" },
  });
}
