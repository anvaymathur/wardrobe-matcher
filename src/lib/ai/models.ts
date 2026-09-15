// Every stylist feature runs on one cheap vision model through the Vercel AI
// Gateway. To stay at $0 it must be on the Gateway's free tier (check the
// "Free Tier" filter in the AI Gateway dashboard); switching models is this line.
// Upgrade path if suggestions feel weak: "anthropic/claude-haiku-4.5" (~$3–9/mo).
export const STYLIST_MODEL = "google/gemini-3.1-flash-lite";

// Guardrails that keep usage (and cost) predictable for a handful of users.
export const LIMITS = {
  chatOutputTokens: 600,
  suggestOutputTokens: 800,
  maxToolSteps: 4,
  maxSearchesPerTurn: 2,
  maxMessageChars: 1000,
  maxPhotos: 3,
  dailyRequests: 40,
  historyWindow: 8,
  maxThreadMessages: 40,
  maxClosetItems: 150,
} as const;

/** Tags each request with the user and feature, so the Gateway dashboard shows
 * who and what the spend went to. */
export function gatewayOptions(userId: string, feature: string) {
  return { gateway: { user: userId, tags: [`feature:${feature}`] } };
}
