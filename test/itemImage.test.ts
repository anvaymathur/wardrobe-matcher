import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { createItem, updateItem } from "@/lib/actions";
import { USER_A } from "./setup";

const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/items/shirt-x1y2.jpg";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("item image (client-uploaded Blob URL)", () => {
  it("createItem stores a valid Blob URL as the image path", async () => {
    await createItem(form({ name: "Photo Shirt", category: "TOP", subtype: "tee", imageUrl: BLOB_URL }));
    const item = await prisma.item.findFirst({ where: { name: "Photo Shirt" } });
    expect(item?.imagePath).toBe(BLOB_URL);
  });

  it("createItem rejects a non-Blob URL and creates nothing", async () => {
    const res = await createItem(
      form({ name: "Evil", category: "TOP", subtype: "tee", imageUrl: "https://evil.example.com/x.jpg" }),
    );
    expect(res).toEqual({ error: "That image couldn't be attached" });
    expect(await prisma.item.count({ where: { name: "Evil" } })).toBe(0);
  });

  it("updateItem attaches a newly uploaded image to an existing item", async () => {
    const item = await prisma.item.create({
      data: { name: "Plain", category: "TOP", subtype: "tee", userId: USER_A },
    });
    const res = await updateItem(
      form({ id: item.id, name: "Plain", category: "TOP", subtype: "tee", imageUrl: BLOB_URL }),
    );
    expect(res).toBeUndefined();
    const after = await prisma.item.findUnique({ where: { id: item.id } });
    expect(after?.imagePath).toBe(BLOB_URL);
  });
});
