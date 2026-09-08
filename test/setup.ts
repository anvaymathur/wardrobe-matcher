import { beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";

// Controllable test state (hoisted so the mock factories can reference it).
const hoisted = vi.hoisted(() => ({
  store: new Map<string, string>(),
  current: { userId: "u1" as string | null },
}));

export const cookieStore = hoisted.store;
export const USER_A = "u1";
export const USER_B = "u2";
export function setCurrentUser(id: string | null) {
  hoisted.current.userId = id;
}

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
vi.mock("@/lib/currentUser", () => ({
  getCurrentUserId: async () => hoisted.current.userId,
  requireUserId: async () => {
    if (!hoisted.current.userId) throw new Error("Not authenticated");
    return hoisted.current.userId;
  },
}));

// Reset cookies, current user, and data before every test.
beforeEach(async () => {
  hoisted.store.clear();
  hoisted.current.userId = USER_A;

  await prisma.collectionItem.deleteMany();
  await prisma.outfitItem.deleteMany();
  await prisma.pairing.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.outfit.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: [
      { id: USER_A, email: "a@test.dev" },
      { id: USER_B, email: "b@test.dev" },
    ],
  });
});
