import { prisma } from "@/lib/prisma";
import { isCategory } from "@/lib/types";

/** All items, newest first, optionally filtered to a single category. */
export async function getItems(category?: string) {
  return prisma.item.findMany({
    where: isCategory(category) ? { category } : undefined,
    orderBy: { createdAt: "desc" },
  });
}

export async function getItem(id: string) {
  return prisma.item.findUnique({ where: { id } });
}
