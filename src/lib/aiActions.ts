"use server";

import { requireUserId } from "@/lib/currentUser";
import { consumeAiQuota, runAi, type AiResult } from "@/lib/ai/guard";
import { suggestMatchesFor, type MatchSuggestion } from "@/lib/ai/suggestMatches";

/** Stylist picks for what goes with an item. On demand only (never on page
 * load), and counted against the user's daily AI allowance. */
export async function suggestMatches(itemId: string): Promise<AiResult<MatchSuggestion[]>> {
  return runAi(async () => {
    const userId = await requireUserId();
    await consumeAiQuota(userId);
    return suggestMatchesFor(userId, itemId);
  });
}
