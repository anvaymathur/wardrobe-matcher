import { beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";

// A controllable cookie jar for tests. Hoisted so the mock factory below (which
// vitest lifts above imports) can reference it; re-exported for tests to set.
const hoisted = vi.hoisted(() => ({ store: new Map<string, string>() }));
export const cookieStore = hoisted.store;

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (hoisted.store.has(k) ? { value: hoisted.store.get(k) } : undefined),
    set: (k: string, v: string) => {
      hoisted.store.set(k, v);
    },
    delete: (k: string) => {
      hoisted.store.delete(k);
    },
  }),
}));

// Reset cookies + data before every test for isolation.
beforeEach(async () => {
  cookieStore.clear();
  await prisma.collectionItem.deleteMany();
  await prisma.outfitItem.deleteMany();
  await prisma.pairing.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.outfit.deleteMany();
  await prisma.item.deleteMany();
});
