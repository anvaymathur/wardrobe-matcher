import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

/** All collections, newest first, with an item count. */
export function getCollections() {
  return prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
}

export function getCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: { items: { include: { item: true } } },
  });
}

/** The active collection id from the cookie, or null for "All". */
export async function getActiveCollectionId(): Promise<string | null> {
  const v = (await cookies()).get("collection")?.value;
  return v && v !== "all" ? v : null;
}

/** The active collection (null if "All", or if it was since deleted). */
export async function getActiveCollection() {
  const id = await getActiveCollectionId();
  if (!id) return null;
  return prisma.collection.findUnique({ where: { id } });
}
