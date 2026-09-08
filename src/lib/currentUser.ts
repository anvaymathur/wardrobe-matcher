import { auth } from "@/auth";

/** The signed-in user's id, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** The signed-in user's id, throwing if not authenticated (use in mutations). */
export async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) throw new Error("Not authenticated");
  return id;
}
