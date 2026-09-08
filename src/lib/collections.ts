import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/currentUser";

/** All collections, newest first, with an item count. */
export async function getCollections() {
  const userId = await requireUserId();
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function getCollection(id: string) {
  const userId = await requireUserId();
  return prisma.collection.findFirst({
    where: { id, userId },
    include: { items: { include: { item: true } } },
  });
}

/** The active collection id from the cookie, or null for "All". */
export async function getActiveCollectionId(): Promise<string | null> {
  const v = (await cookies()).get("collection")?.value;
  return v && v !== "all" ? v : null;
}

/** The active collection (null if "All", not owned, or since deleted). */
export async function getActiveCollection() {
  const id = await getActiveCollectionId();
  if (!id) return null;
  const userId = await requireUserId();
  return prisma.collection.findFirst({ where: { id, userId } });
}
