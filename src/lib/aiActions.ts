"use server";

import { requireUserId } from "@/lib/currentUser";
import { AiUserError, consumeAiQuota, runAi, type AiResult } from "@/lib/ai/guard";
import { suggestMatchesFor, type MatchSuggestion } from "@/lib/ai/suggestMatches";
import { suggestOutfitsFor, type OutfitSuggestion } from "@/lib/ai/suggestOutfits";

/** Stylist picks for what goes with an item. On demand only (never on page
 * load), and counted against the user's daily AI allowance. */
export async function suggestMatches(itemId: string): Promise<AiResult<MatchSuggestion[]>> {
  return runAi(async () => {
    if (typeof itemId !== "string" || !itemId) throw new AiUserError("That item couldn't be found.");
    const userId = await requireUserId();
    await consumeAiQuota(userId);
    return suggestMatchesFor(userId, itemId);
  });
}

/** Stylist outfit ideas, optionally built around picked items and a short
 * brief ("rainy office day"). Arguments come from the browser, so they're
 * re-checked here before use. */
export async function suggestOutfits(input: {
  brief?: unknown;
  anchorItemIds?: unknown;
}): Promise<AiResult<OutfitSuggestion[]>> {
  return runAi(async () => {
    const userId = await requireUserId();
    const brief = typeof input?.brief === "string" ? input.brief : "";
    const anchorItemIds = Array.isArray(input?.anchorItemIds)
      ? input.anchorItemIds.filter((id): id is string => typeof id === "string").slice(0, 4)
      : [];
    await consumeAiQuota(userId);
    return suggestOutfitsFor(userId, { brief, anchorItemIds });
  });
}
