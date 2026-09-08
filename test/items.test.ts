import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getItems, getUnpairedCount } from "@/lib/items";

async function seed() {
  await prisma.item.createMany({
    data: [
      { id: "t1", name: "White Tee", category: "TOP", subtype: "t-shirt", color: "white", favorite: true },
      { id: "t2", name: "Black Hoodie", category: "TOP", subtype: "hoodie" },
      { id: "b1", name: "Blue Jeans", category: "BOTTOM", subtype: "jeans", color: "blue" },
    ],
  });
}

describe("getItems", () => {
  beforeEach(seed);

  it("filters by category", async () => {
    const tops = await getItems({ category: "TOP" });
    expect(tops.map((i) => i.id).sort()).toEqual(["t1", "t2"]);
  });

  it("searches across name, subtype, and color", async () => {
    expect((await getItems({ q: "jeans" })).map((i) => i.id)).toEqual(["b1"]);
    expect((await getItems({ q: "white" })).map((i) => i.id)).toEqual(["t1"]);
    expect((await getItems({ q: "hood" })).map((i) => i.id)).toEqual(["t2"]);
  });

  it("filters favorites", async () => {
    expect((await getItems({ favorite: true })).map((i) => i.id)).toEqual(["t1"]);
  });

  it("sorts by name A–Z", async () => {
    const names = (await getItems({ sort: "name" })).map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("filters unpaired items and counts them", async () => {
    expect((await getItems({ unpaired: true })).length).toBe(3);
    expect(await getUnpairedCount()).toBe(3);

    await prisma.pairing.create({ data: { itemAId: "b1", itemBId: "t1", tier: 1 } });
    const unpaired = (await getItems({ unpaired: true })).map((i) => i.id).sort();
    expect(unpaired).toEqual(["t2"]);
    expect(await getUnpairedCount()).toBe(1);
  });

  it("scopes to a collection", async () => {
    const col = await prisma.collection.create({
      data: { name: "Trip", items: { create: [{ itemId: "t1" }, { itemId: "b1" }] } },
    });
    const scoped = await getItems({ collectionId: col.id });
    expect(scoped.map((i) => i.id).sort()).toEqual(["b1", "t1"]);
  });
});
