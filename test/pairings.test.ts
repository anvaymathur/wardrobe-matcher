import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPairing } from "@/lib/actions";
import { getPairingsForItem, getCandidateItems } from "@/lib/pairings";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("pairings", () => {
  beforeEach(async () => {
    await prisma.item.createMany({
      data: [
        { id: "top", name: "Tee", category: "TOP", subtype: "tee" },
        { id: "bot", name: "Jeans", category: "BOTTOM", subtype: "jeans" },
        { id: "top2", name: "Hoodie", category: "TOP", subtype: "hoodie" },
      ],
    });
  });

  it("stores a pair once regardless of direction, and re-adding updates the tier", async () => {
    await createPairing(form({ itemId: "top", otherId: "bot", tier: "1" }));
    expect(await prisma.pairing.count()).toBe(1);

    // Same pair, opposite direction + different tier → still one row, tier updated.
    await createPairing(form({ itemId: "bot", otherId: "top", tier: "2" }));
    expect(await prisma.pairing.count()).toBe(1);
    expect((await prisma.pairing.findFirst())?.tier).toBe(2);
  });

  it("rejects matching two items of the same category", async () => {
    await expect(createPairing(form({ itemId: "top", otherId: "top2", tier: "1" }))).rejects.toThrow();
    expect(await prisma.pairing.count()).toBe(0);
  });

  it("returns the partner item from either side", async () => {
    await createPairing(form({ itemId: "top", otherId: "bot", tier: "1" }));
    const fromTop = await getPairingsForItem("top");
    const fromBot = await getPairingsForItem("bot");
    expect(fromTop.map((p) => p.item.id)).toEqual(["bot"]);
    expect(fromBot.map((p) => p.item.id)).toEqual(["top"]);
  });

  it("offers only different-category, not-yet-matched items as candidates", async () => {
    // Before any pairing, a top's candidates are the bottoms only (not other tops).
    const before = await getCandidateItems({ id: "top", category: "TOP" });
    expect(before.map((i) => i.id)).toEqual(["bot"]);

    await createPairing(form({ itemId: "top", otherId: "bot", tier: "1" }));
    const after = await getCandidateItems({ id: "top", category: "TOP" });
    expect(after).toHaveLength(0); // bot now matched, top2 is same category
  });
});
