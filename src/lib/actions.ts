"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/currentUser";
import { saveImage, deleteImage } from "@/lib/storage";
import { isCategory, isValidTier } from "@/lib/types";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function selectedItemIds(formData: FormData): string[] {
  return formData.getAll("itemId").map(String).filter(Boolean);
}

/** Narrow a list of item ids to the ones actually owned by the user. */
async function ownedItemIds(userId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.item.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

type ItemFields = {
  name: string;
  category: string;
  subtype: string;
  color: string | null;
  notes: string | null;
  sourceUrl: string | null;
};

/** Validate the shared item fields, returning either the fields or an error. */
function readItemFields(
  formData: FormData,
): { ok: true; fields: ItemFields } | { ok: false; error: string } {
  const name = text(formData, "name");
  const category = text(formData, "category");
  const subtype = text(formData, "subtype");

  if (!name) return { ok: false, error: "Name is required" };
  if (!isCategory(category)) return { ok: false, error: "Please choose a category" };
  if (!subtype) return { ok: false, error: "Subtype is required" };

  return {
    ok: true,
    fields: {
      name,
      category,
      subtype,
      color: text(formData, "color") || null,
      notes: text(formData, "notes") || null,
      sourceUrl: text(formData, "sourceUrl") || null,
    },
  };
}

// Actions return an error object on failure (so the form can keep the user's
// input and let them retry) and redirect on success.
export type ItemActionResult = { error: string } | void;

/** Add a freshly-created item to the active collection, if the user owns one. */
async function addToActiveCollection(userId: string, itemId: string) {
  const activeId = (await cookies()).get("collection")?.value;
  if (!activeId || activeId === "all") return;

  const owned = await prisma.collection.findFirst({
    where: { id: activeId, userId },
    select: { id: true },
  });
  if (owned) {
    await prisma.collectionItem.create({ data: { collectionId: activeId, itemId } });
  }
}

export async function createItem(formData: FormData): Promise<ItemActionResult> {
  const parsed = readItemFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const userId = await requireUserId();
    const image = formData.get("image");
    const imagePath =
      image instanceof File && image.size > 0 ? await saveImage(image) : null;

    const item = await prisma.item.create({ data: { ...parsed.fields, imagePath, userId } });
    // So adding an item while inside a collection puts it in that collection.
    await addToActiveCollection(userId, item.id);
  } catch {
    return { error: "Couldn't save the item. Please try again." };
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateItem(formData: FormData): Promise<ItemActionResult> {
  const id = text(formData, "id");
  if (!id) return { error: "Missing item id" };

  const parsed = readItemFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    const userId = await requireUserId();
    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) return { error: "Item not found" };

    // Only replace the image if a new file was uploaded; otherwise keep the current one.
    const image = formData.get("image");
    let imagePath = existing.imagePath;
    if (image instanceof File && image.size > 0) {
      imagePath = await saveImage(image);
      await deleteImage(existing.imagePath);
    }

    await prisma.item.update({ where: { id }, data: { ...parsed.fields, imagePath } });
  } catch {
    return { error: "Couldn't save changes. Please try again." };
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteItem(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Missing item id");
  const userId = await requireUserId();

  const existing = await prisma.item.findFirst({ where: { id, userId } });
  if (!existing) return;
  // Deleting the item cascades to its pairings (see schema).
  await prisma.item.delete({ where: { id } });
  await deleteImage(existing.imagePath);

  revalidatePath("/");
}

export async function createPairing(formData: FormData) {
  const itemId = text(formData, "itemId");
  const otherId = text(formData, "otherId");
  const tier = Number(text(formData, "tier"));
  const userId = await requireUserId();

  if (!itemId || !otherId) throw new Error("Please pick an item to match");
  if (itemId === otherId) throw new Error("An item can't be matched with itself");
  if (!isValidTier(tier)) throw new Error("Tier must be 1, 2, or 3");

  // Both items must belong to the user; matches are cross-category.
  const [a, b] = await Promise.all([
    prisma.item.findFirst({ where: { id: itemId, userId } }),
    prisma.item.findFirst({ where: { id: otherId, userId } }),
  ]);
  if (!a || !b) throw new Error("Item not found");
  if (a.category === b.category) {
    throw new Error("Items in the same category can't be matched");
  }

  // Store each pair once by normalizing the order of the two ids.
  const [itemAId, itemBId] = [itemId, otherId].sort();

  await prisma.pairing.upsert({
    where: { itemAId_itemBId: { itemAId, itemBId } },
    create: { itemAId, itemBId, tier, userId },
    update: { tier },
  });

  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/items/${otherId}`);
}

export async function deletePairing(formData: FormData) {
  const pairingId = text(formData, "pairingId");
  const itemId = text(formData, "itemId");
  if (!pairingId) throw new Error("Missing pairing id");
  const userId = await requireUserId();

  await prisma.pairing.deleteMany({ where: { id: pairingId, userId } });

  if (itemId) revalidatePath(`/items/${itemId}`);
}

export async function toggleFavorite(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Missing item id");
  const userId = await requireUserId();

  const item = await prisma.item.findFirst({ where: { id, userId }, select: { favorite: true } });
  if (!item) throw new Error("Item not found");

  await prisma.item.update({ where: { id }, data: { favorite: !item.favorite } });

  revalidatePath("/");
  revalidatePath(`/items/${id}`);
}

export async function createOutfit(formData: FormData) {
  const name = text(formData, "name");
  const userId = await requireUserId();
  const itemIds = await ownedItemIds(userId, selectedItemIds(formData));
  if (!name) throw new Error("Give the outfit a name");
  if (itemIds.length === 0) throw new Error("Pick at least one item");

  const outfit = await prisma.outfit.create({
    data: {
      name,
      notes: text(formData, "notes") || null,
      userId,
      items: { create: itemIds.map((itemId) => ({ itemId })) },
    },
  });

  revalidatePath("/outfits");
  redirect(`/outfits/${outfit.id}`);
}

export async function updateOutfit(formData: FormData) {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const userId = await requireUserId();
  const itemIds = await ownedItemIds(userId, selectedItemIds(formData));
  if (!id) throw new Error("Missing outfit id");
  if (!name) throw new Error("Give the outfit a name");
  if (itemIds.length === 0) throw new Error("Pick at least one item");

  const existing = await prisma.outfit.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new Error("Outfit not found");

  await prisma.outfitItem.deleteMany({ where: { outfitId: id } });
  await prisma.outfit.update({
    where: { id },
    data: { name, notes: text(formData, "notes") || null, items: { create: itemIds.map((itemId) => ({ itemId })) } },
  });

  revalidatePath("/outfits");
  revalidatePath(`/outfits/${id}`);
  redirect(`/outfits/${id}`);
}

export async function deleteOutfit(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Missing outfit id");
  const userId = await requireUserId();

  await prisma.outfit.deleteMany({ where: { id, userId } }); // cascades to OutfitItem

  revalidatePath("/outfits");
  redirect("/outfits");
}

const COLLECTION_COOKIE = "collection";

export async function createCollection(formData: FormData) {
  const name = text(formData, "name");
  const userId = await requireUserId();
  const itemIds = await ownedItemIds(userId, selectedItemIds(formData));
  if (!name) throw new Error("Give the collection a name");
  if (itemIds.length === 0) throw new Error("Pick at least one item");

  const collection = await prisma.collection.create({
    data: { name, userId, items: { create: itemIds.map((itemId) => ({ itemId })) } },
  });

  // Creating a collection makes it the active one.
  (await cookies()).set(COLLECTION_COOKIE, collection.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/");
  redirect("/");
}

export async function updateCollection(formData: FormData) {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const userId = await requireUserId();
  const itemIds = await ownedItemIds(userId, selectedItemIds(formData));
  if (!id) throw new Error("Missing collection id");
  if (!name) throw new Error("Give the collection a name");
  if (itemIds.length === 0) throw new Error("Pick at least one item");

  const existing = await prisma.collection.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) throw new Error("Collection not found");

  await prisma.collectionItem.deleteMany({ where: { collectionId: id } });
  await prisma.collection.update({
    where: { id },
    data: { name, items: { create: itemIds.map((itemId) => ({ itemId })) } },
  });

  revalidatePath("/");
  redirect("/");
}

export async function deleteCollection(formData: FormData) {
  const id = text(formData, "id");
  if (!id) throw new Error("Missing collection id");
  const userId = await requireUserId();

  await prisma.collection.deleteMany({ where: { id, userId } }); // cascades to CollectionItem

  const jar = await cookies();
  if (jar.get(COLLECTION_COOKIE)?.value === id) jar.delete(COLLECTION_COOKIE);

  revalidatePath("/");
  redirect("/");
}
