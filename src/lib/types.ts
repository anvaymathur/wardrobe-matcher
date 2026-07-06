// Allowed clothing categories. SQLite/Prisma has no native enums, so `category`
// is stored as a plain string and validated against these values in app code.
export const CATEGORIES = ["TOP", "BOTTOM", "OUTERWEAR", "SHOES"] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

// Pairing tiers: 1 = best match, up to 3.
export const MIN_TIER = 1;
export const MAX_TIER = 3;

export function isValidTier(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_TIER && value <= MAX_TIER;
}
