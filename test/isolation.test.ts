import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { getItems } from "@/lib/items";
import { createItem, deleteItem, toggleFavorite } from "@/lib/actions";
import { USER_A, USER_B, setCurrentUser } from "./setup";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("user isolation", () => {
  it("each user only sees their own items", async () => {
    await prisma.item.create({ data: { name: "A's Tee", category: "TOP", subtype: "tee", userId: USER_A } });
    await prisma.item.create({ data: { name: "B's Tee", category: "TOP", subtype: "tee", userId: USER_B } });

    setCurrentUser(USER_A);
    expect((await getItems()).map((i) => i.name)).toEqual(["A's Tee"]);

    setCurrentUser(USER_B);
    expect((await getItems()).map((i) => i.name)).toEqual(["B's Tee"]);
  });

  it("createItem stamps the current user as owner", async () => {
    setCurrentUser(USER_B);
    await createItem(form({ name: "B item", category: "TOP", subtype: "tee" }));
    const it = await prisma.item.findFirst({ where: { name: "B item" } });
    expect(it?.userId).toBe(USER_B);
  });

  it("a user cannot delete or favorite another user's item", async () => {
    const bItem = await prisma.item.create({
      data: { name: "B's Jacket", category: "OUTERWEAR", subtype: "jacket", userId: USER_B, favorite: false },
    });

    setCurrentUser(USER_A);
    await deleteItem(form({ id: bItem.id })); // not owned → no-op
    await toggleFavorite(form({ id: bItem.id })).catch(() => {}); // not owned → throws/no-op

    const still = await prisma.item.findUnique({ where: { id: bItem.id } });
    expect(still).not.toBeNull();
    expect(still?.favorite).toBe(false);
  });
});
