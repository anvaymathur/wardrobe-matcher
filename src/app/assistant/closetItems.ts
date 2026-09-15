import { getItems } from "@/lib/items";
import type { ShownItem } from "@/lib/ai/stylistChat";

/** The closet trimmed to what the chat UI needs (tag picker, cards, chips). */
export async function chatClosetItems(): Promise<ShownItem[]> {
  const items = await getItems({ sort: "name" });
  return items.map(({ id, name, imagePath, category, subtype }) => ({ id, name, imagePath, category, subtype }));
}
