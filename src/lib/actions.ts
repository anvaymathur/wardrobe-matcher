"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saveImage, deleteImage } from "@/lib/storage";
import { isCategory, isValidTier } from "@/lib/types";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Read and validate the shared item fields from a form submission. */
function readItemFields(formData: FormData) {
  const name = text(formData, "name");
  const category = text(formData, "category");
  const subtype = text(formData, "subtype");

  if (!name) throw new Error("Name is required");
  if (!isCategory(category)) throw new Error("Please choose a valid category");
  if (!subtype) throw new Error("Subtype is required");

  return {
    name,
    category,
    subtype,
    color: text(formData, "color") || null,
    notes: text(formData, "notes") || null,
    sourceUrl: text(formData, "sourceUrl") || null,
  };
}

export async function createItem(formData: FormData) {
  const fields = readItemFields(formData);

  const image = formData.get("image");
  const imagePath =
    image instanceof File && image.size > 0 ? await saveImage(image) : null;

  await prisma.item.create({ data: { ...fields, imagePath } });

  revalidatePath("/");
  redirect("/");
}

export async function updateItem(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Missing item id");

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new Error("Item not found");

  const fields = readItemFields(formData);

  // Only replace the image if a new file was uploaded; otherwise keep the current one.
  const image = formData.get("image");
  let imagePath = existing.imagePath;
  if (image instanceof File && image.size > 0) {
    imagePath = await saveImage(image);
    await deleteImage(existing.imagePath);
  }

  await prisma.item.update({ where: { id }, data: { ...fields, imagePath } });

  revalidatePath("/");
  redirect("/");
}

export async function deleteItem(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Missing item id");

  const existing = await prisma.item.findUnique({ where: { id } });
  // Deleting the item cascades to its pairings (see schema).
  await prisma.item.delete({ where: { id } });
  await deleteImage(existing?.imagePath ?? null);

  revalidatePath("/");
}

export async function createPairing(formData: FormData) {
  const itemId = text(formData, "itemId");
  const otherId = text(formData, "otherId");
  const tier = Number(text(formData, "tier"));

  if (!itemId || !otherId) throw new Error("Please pick an item to match");
  if (itemId === otherId) throw new Error("An item can't be matched with itself");
  if (!isValidTier(tier)) throw new Error("Tier must be 1, 2, or 3");

  // Matches are cross-category (e.g. a top with a bottom), never same-category.
  const [a, b] = await Promise.all([
    prisma.item.findUnique({ where: { id: itemId } }),
    prisma.item.findUnique({ where: { id: otherId } }),
  ]);
  if (!a || !b) throw new Error("Item not found");
  if (a.category === b.category) {
    throw new Error("Items in the same category can't be matched");
  }

  // Store each pair once by normalizing the order of the two ids.
  const [itemAId, itemBId] = [itemId, otherId].sort();

  // Upsert so re-adding an existing pair simply updates its tier.
  await prisma.pairing.upsert({
    where: { itemAId_itemBId: { itemAId, itemBId } },
    create: { itemAId, itemBId, tier },
    update: { tier },
  });

  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/items/${otherId}`);
}

export async function deletePairing(formData: FormData) {
  const pairingId = text(formData, "pairingId");
  const itemId = text(formData, "itemId");
  if (!pairingId) throw new Error("Missing pairing id");

  await prisma.pairing.delete({ where: { id: pairingId } });

  if (itemId) revalidatePath(`/items/${itemId}`);
}
