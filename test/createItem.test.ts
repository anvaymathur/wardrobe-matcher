import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { getItems } from "@/lib/items";
import { createItem } from "@/lib/actions";
import { cookieStore, USER_A } from "./setup";

function itemForm(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("createItem", () => {
  it("adds a new item to the active collection, so it shows in the scoped closet", async () => {
    await prisma.item.create({ data: { id: "seed", name: "Seed Tee", category: "TOP", subtype: "tee", userId: USER_A } });
    const col = await prisma.collection.create({
      data: { name: "Japan Trip", userId: USER_A, items: { create: [{ itemId: "seed" }] } },
    });
    cookieStore.set("collection", col.id);

    await createItem(itemForm({ name: "Packed Shirt", category: "TOP", subtype: "tee" }));

    const scoped = await getItems({ collectionId: col.id });
    expect(scoped.map((i) => i.name).sort()).toEqual(["Packed Shirt", "Seed Tee"]);

    const created = await prisma.item.findFirst({
      where: { name: "Packed Shirt" },
      include: { collections: true },
    });
    expect(created?.userId).toBe(USER_A);
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
    expect(res).toBeUndefined();
    expect(await prisma.item.count({ where: { name: "Ghost" } })).toBe(1);
  });

  it("stores the no-repeat flag (default false, true when set)", async () => {
    await createItem(itemForm({ name: "Jeans", category: "BOTTOM", subtype: "jeans" }));
    const jeans = await prisma.item.findFirst({ where: { name: "Jeans" } });
    expect(jeans?.noRepeat).toBe(false);

    await createItem(itemForm({ name: "Graphic Tee", category: "TOP", subtype: "tee", noRepeat: "1" }));
    const tee = await prisma.item.findFirst({ where: { name: "Graphic Tee" } });
    expect(tee?.noRepeat).toBe(true);
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
