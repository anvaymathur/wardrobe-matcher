import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { getItems } from "@/lib/items";
import { createItem } from "@/lib/actions";
import { cookieStore } from "./setup";

function itemForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("createItem", () => {
  it("adds a new item to the active collection, so it shows in the scoped closet", async () => {
    // A collection with one item, marked active.
    await prisma.item.create({ data: { id: "seed", name: "Seed Tee", category: "TOP", subtype: "tee" } });
    const col = await prisma.collection.create({
      data: { name: "Japan Trip", items: { create: [{ itemId: "seed" }] } },
    });
    cookieStore.set("collection", col.id);

    await createItem(itemForm({ name: "Packed Shirt", category: "TOP", subtype: "tee" }));

    const scoped = await getItems({ collectionId: col.id });
    expect(scoped.map((i) => i.name).sort()).toEqual(["Packed Shirt", "Seed Tee"]);

    const created = await prisma.item.findFirst({
      where: { name: "Packed Shirt" },
      include: { collections: true },
    });
    expect(created?.collections).toHaveLength(1);
  });

  it("does not touch collections when none is active", async () => {
    await createItem(itemForm({ name: "Loose Shirt", category: "TOP", subtype: "tee" }));
    const created = await prisma.item.findFirst({
      where: { name: "Loose Shirt" },
      include: { collections: true },
    });
    expect(created?.collections).toHaveLength(0);
  });

  it("ignores a stale/deleted active collection without crashing", async () => {
    cookieStore.set("collection", "does-not-exist");
    const res = await createItem(itemForm({ name: "Ghost", category: "TOP", subtype: "tee" }));
    expect(res).toBeUndefined(); // success (redirects)
    expect(await prisma.item.count({ where: { name: "Ghost" } })).toBe(1);
  });

  it("returns an error (and creates nothing) when a required field is missing", async () => {
    const res = await createItem(itemForm({ name: "", category: "TOP", subtype: "tee" }));
    expect(res).toEqual({ error: "Name is required" });
    expect(await prisma.item.count()).toBe(0);

    const res2 = await createItem(itemForm({ name: "X", category: "NOPE", subtype: "tee" }));
    expect(res2).toEqual({ error: "Please choose a category" });
    expect(await prisma.item.count()).toBe(0);
  });
});
