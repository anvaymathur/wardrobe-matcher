import type { FilePart } from "ai";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/types";
import { LIMITS } from "./models";

export type AiItem = {
  id: string;
  name: string;
  category: string;
  subtype: string;
  color: string | null;
  notes: string | null;
  sourceUrl: string | null;
  imagePath: string | null;
  favorite: boolean;
};

export type Closet = {
  items: AiItem[];
  /** itemId → [{ otherId, tier }] */
  pairings: Map<string, { otherId: string; tier: number }[]>;
};

/** A user's items plus every pairing, in two queries. */
export async function loadCloset(userId: string): Promise<Closet> {
  const [items, rows] = await Promise.all([
    prisma.item.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        category: true,
        subtype: true,
        color: true,
        notes: true,
        sourceUrl: true,
        imagePath: true,
        favorite: true,
      },
      orderBy: [{ favorite: "desc" }, { createdAt: "desc" }],
    }),
    prisma.pairing.findMany({
      where: { userId },
      select: { itemAId: true, itemBId: true, tier: true },
    }),
  ]);

  const pairings = new Map<string, { otherId: string; tier: number }[]>();
  for (const { itemAId, itemBId, tier } of rows) {
    (pairings.get(itemAId) ?? pairings.set(itemAId, []).get(itemAId)!).push({ otherId: itemBId, tier });
    (pairings.get(itemBId) ?? pairings.set(itemBId, []).get(itemBId)!).push({ otherId: itemAId, tier });
  }
  return { items, pairings };
}

/**
 * Short aliases ("i1", "i2", …) stand in for real ids in prompts: they cost a
 * fraction of the tokens of a UUID, and anything the model answers with is
 * mapped back and checked against this table, so it can't reference an item
 * the user doesn't own.
 */
export class AliasTable {
  private toId = new Map<string, string>();
  private toAlias = new Map<string, string>();

  constructor(ids: string[]) {
    ids.forEach((id, i) => {
      const alias = `i${i + 1}`;
      this.toId.set(alias, id);
      this.toAlias.set(id, alias);
    });
  }

  alias(id: string): string | undefined {
    return this.toAlias.get(id);
  }

  /** The real id for an alias, or undefined if the model made it up. */
  id(alias: string): string | undefined {
    return this.toId.get(alias.trim().toLowerCase());
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const STRENGTH = ["", "best", "good", "okay"];

/** One compact line describing an item, e.g.
 * `i3 · TOP/oxford shirt · "White Oxford" · white · ★ · heavyweight cotton · goes with i4(best), i9(good)` */
export function describeItem(item: AiItem, aliases: AliasTable, closet?: Closet, detail = false): string {
  const parts = [
    aliases.alias(item.id) ?? "?",
    `${item.category}/${item.subtype}`,
    `"${clip(item.name, 60)}"`,
  ];
  if (item.color) parts.push(clip(item.color, 30));
  if (item.favorite) parts.push("★");
  if (item.notes) parts.push(clip(item.notes.replace(/\s+/g, " "), detail ? 300 : 80));
  if (item.sourceUrl) parts.push(`link ${clip(item.sourceUrl, detail ? 200 : 60)}`);
  const matched = closet?.pairings.get(item.id);
  if (matched?.length) {
    const shown = matched
      .map(({ otherId, tier }) => {
        const a = aliases.alias(otherId);
        return a ? `${a}(${STRENGTH[tier] ?? "good"})` : null;
      })
      .filter(Boolean)
      .slice(0, detail ? 20 : 6);
    if (shown.length) parts.push(`goes with ${shown.join(", ")}`);
  }
  return parts.join(" · ");
}

/** The closet as prompt text, grouped by type, capped for cost. Favorites and
 * newer items are kept first when the cap applies. */
export function closetIndex(closet: Closet, aliases: AliasTable, items = closet.items): string {
  const capped = items.slice(0, LIMITS.maxClosetItems);
  const lines: string[] = [];
  for (const category of CATEGORIES) {
    const group = capped.filter((i) => i.category === category);
    if (group.length === 0) continue;
    lines.push(`${category}:`);
    for (const item of group) lines.push(`  ${describeItem(item, aliases, closet)}`);
  }
  if (items.length > capped.length) lines.push(`(+${items.length - capped.length} more items not listed)`);
  return lines.join("\n") || "(the closet is empty)";
}

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** An item's photo URL with its media type — only for our own Blob storage, so
 * a model provider is never pointed at an arbitrary address. */
export function photoUrl(item: Pick<AiItem, "imagePath">): { url: string; mediaType: string } | null {
  if (!item.imagePath) return null;
  try {
    const url = new URL(item.imagePath);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".blob.vercel-storage.com")) return null;
    const ext = url.pathname.split(".").pop()?.toLowerCase() ?? "";
    return { url: url.toString(), mediaType: IMAGE_TYPES[ext] ?? "image/jpeg" };
  } catch {
    return null;
  }
}

/** Photo of an item as a model image part (see `photoUrl`). */
export function imagePart(item: AiItem): FilePart | null {
  const photo = photoUrl(item);
  return photo ? { type: "file", mediaType: photo.mediaType, data: new URL(photo.url) } : null;
}
