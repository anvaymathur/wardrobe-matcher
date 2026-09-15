import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { AliasTable, closetIndex, describeItem, imagePart, loadCloset, type AiItem } from "./closet";
import { AiUserError, STYLIST_POLICY } from "./guard";
import { LIMITS, STYLIST_MODEL, gatewayOptions } from "./models";

export type MatchSuggestion = { itemId: string; strength: number; reason: string };

const MAX_SUGGESTIONS = 6;

const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        item: z.string().describe("Alias of a candidate item, e.g. i12"),
        strength: z.number().describe("1 = great match, 2 = good, 3 = okay"),
        reason: z.string().describe("Why it works, under 90 characters"),
      }),
    )
    .describe("Best candidates first; empty if nothing genuinely works"),
});

const TASK = `Task: suggest which candidate items pair well with the "item to match".
Judge color harmony, formality, style, pattern and season. The item's existing matches show the user's taste.
Only choose from the candidates listed. Suggest at most ${MAX_SUGGESTIONS}, best first; fewer is fine.`;

/**
 * Keep only suggestions that are real, allowed picks: aliases that map to a
 * candidate (different type, not already matched), no duplicates, capped.
 */
export function filterMatchSuggestions(
  raw: z.infer<typeof suggestionSchema>["suggestions"],
  aliases: AliasTable,
  candidates: AiItem[],
): MatchSuggestion[] {
  const allowed = new Set(candidates.map((c) => c.id));
  const seen = new Set<string>();
  const out: MatchSuggestion[] = [];
  for (const s of raw) {
    const id = aliases.id(s.item);
    if (!id || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    const strength = Math.min(3, Math.max(1, Math.round(Number(s.strength) || 2)));
    out.push({ itemId: id, strength, reason: s.reason.trim().slice(0, 140) });
    if (out.length === MAX_SUGGESTIONS) break;
  }
  return out;
}

/** Ask the stylist which of the user's other items go with `itemId`. */
export async function suggestMatchesFor(
  userId: string,
  itemId: string,
  model: LanguageModel = STYLIST_MODEL,
): Promise<MatchSuggestion[]> {
  const closet = await loadCloset(userId);
  const anchor = closet.items.find((i) => i.id === itemId);
  if (!anchor) throw new AiUserError("That item couldn't be found.");

  const matched = new Set((closet.pairings.get(itemId) ?? []).map((p) => p.otherId));
  const candidates = closet.items.filter(
    (i) => i.id !== itemId && i.category !== anchor.category && !matched.has(i.id),
  );
  if (candidates.length === 0) return [];

  const aliases = new AliasTable(closet.items.map((i) => i.id));
  const photo = imagePart(anchor);
  const text = [
    `Item to match${photo ? " (photo attached)" : ""}:\n${describeItem(anchor, aliases, closet, true)}`,
    `Candidates:\n${closetIndex(closet, aliases, candidates)}`,
  ].join("\n\n");

  const { output } = await generateText({
    model,
    instructions: `${STYLIST_POLICY}\n\n${TASK}`,
    messages: [{ role: "user", content: photo ? [{ type: "text", text }, photo] : text }],
    output: Output.object({ schema: suggestionSchema }),
    maxOutputTokens: LIMITS.suggestOutputTokens,
    reasoning: "minimal",
    maxRetries: 1,
    providerOptions: gatewayOptions(userId, "suggest-matches"),
  });

  return filterMatchSuggestions(output.suggestions, aliases, candidates);
}
