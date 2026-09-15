import {
  gateway,
  generateText,
  isStepCount,
  tool,
  ToolLoopAgent,
  type FileUIPart,
  type InferUITools,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { AliasTable, closetIndex, describeItem, photoUrl, type Closet } from "./closet";
import { STYLIST_POLICY } from "./guard";
import { LIMITS, STYLIST_MODEL, gatewayOptions } from "./models";
import { SEARCH_TOOL, type ProductCard } from "./products";

// ── Message shape ─────────────────────────────────────────────────────────────

export const chatMetadataSchema = z.object({
  /** Items the user tagged on this message (real ids, checked server-side). */
  taggedItemIds: z.array(z.string()).max(4).optional(),
});
export type ChatMetadata = z.infer<typeof chatMetadataSchema>;

export type ShownItem = { id: string; name: string; imagePath: string | null; category: string; subtype: string };

// ── Tools ─────────────────────────────────────────────────────────────────────

/**
 * Read-only tools bound to one user's closet. The model only ever sees aliases;
 * cards shown in the UI carry real ids, but `toModelOutput` keeps those (and
 * photo URLs) out of the model's context.
 */
export function createStylistTools(closet: Closet, aliases: AliasTable) {
  const byId = new Map(closet.items.map((i) => [i.id, i]));
  const resolve = (alias: string) => byId.get(aliases.id(alias) ?? "");

  return {
    getItemDetails: tool({
      description:
        "Full details for one of the user's items: description, product link, and everything it's already matched with.",
      inputSchema: z.object({ item: z.string().describe("Item alias, e.g. i12") }),
      execute: async ({ item }) => {
        const found = resolve(item);
        return { details: found ? describeItem(found, aliases, closet, true) : "No item with that alias." };
      },
    }),

    showItems: tool({
      description:
        "Show items from the user's closet as cards in the chat. Call this whenever you recommend or point to specific items they own.",
      inputSchema: z.object({
        items: z.array(z.string()).describe("Item aliases, e.g. [\"i3\", \"i12\"]"),
        caption: z.string().optional().describe("Very short heading, e.g. \"Try these\""),
      }),
      execute: async ({ items, caption }) => {
        const seen = new Set<string>();
        const shown: ShownItem[] = [];
        for (const alias of items) {
          const found = resolve(alias);
          if (!found || seen.has(found.id)) continue;
          seen.add(found.id);
          const { id, name, imagePath, category, subtype } = found;
          shown.push({ id, name, imagePath, category, subtype });
          if (shown.length === 8) break;
        }
        return { caption: caption?.trim().slice(0, 80) || null, items: shown };
      },
      toModelOutput: ({ output }) => ({
        type: "text",
        value: output.items.length
          ? `Showing ${output.items.length} item card(s) to the user.`
          : "None of those aliases exist, so nothing was shown.",
      }),
    }),

    // Web search, run by the AI Gateway ($5 per 1,000 searches). Kept small:
    // few results and short page extracts, since everything returned is billed
    // as input tokens on the next step.
    [SEARCH_TOOL]: gateway.tools.perplexitySearch({ maxResults: 5, maxTokensPerPage: 512, maxTokens: 3000 }),

    showProducts: tool({
      description:
        "Show shopping options as product cards with links. Only use products and exact URLs that appeared in web search results in this reply.",
      inputSchema: z.object({
        products: z
          .array(
            z.object({
              title: z.string().describe("Product name as listed"),
              url: z.string().describe("Exact product page URL from the search results"),
              price: z.string().optional().describe("Price as shown in the result, e.g. \"$49.90\""),
              reason: z.string().describe("Why it suits the user and their items, one short sentence"),
            }),
          )
          .describe("2–4 options"),
      }),
      execute: async ({ products }) => ({
        // Links are checked against the search results before being shown or saved.
        products: products.slice(0, 4).map(
          (p): ProductCard => ({
            title: p.title.trim().slice(0, 120),
            url: p.url.trim(),
            store: "",
            price: p.price?.trim().slice(0, 30) || null,
            reason: p.reason.trim().slice(0, 160),
          }),
        ),
      }),
      toModelOutput: ({ output }) => ({
        type: "text",
        value: `Showing ${output.products.length} product card(s) to the user.`,
      }),
    }),
  };
}

export type StylistTools = ReturnType<typeof createStylistTools>;
export type StylistUIMessage = UIMessage<ChatMetadata, never, InferUITools<StylistTools>>;

// ── Context building ──────────────────────────────────────────────────────────

/** All the text in a message (what the length limit and titles look at). */
export function messageText(message: Pick<UIMessage, "parts">): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();
}

/**
 * The slice of stored history resent to the model: the last few messages that
 * the rolling summary doesn't already cover. Starts on a user turn, since some
 * providers reject a conversation that opens with the assistant.
 */
export function selectHistory<T extends { role: string }>(
  history: T[],
  summarizedCount: number,
  window: number = LIMITS.historyWindow,
): T[] {
  const slice = history.slice(Math.max(summarizedCount, history.length - window));
  while (slice.length && slice[0].role !== "user") slice.shift();
  return slice;
}

/** Whether older messages have fallen outside the window and need folding into
 * the summary. Returns the new `summarizedCount`, or null if nothing to do. */
export function summaryTarget(total: number, summarizedCount: number, window: number = LIMITS.historyWindow) {
  const target = total - window;
  return target > summarizedCount ? target : null;
}

/**
 * Add tagged items to user messages before they go to the model: a text line
 * with each item's details on every tagged message, plus photos (capped) on the
 * newest one only. Also drops any non-text parts a client might have sent.
 */
export function withTaggedItems(
  messages: StylistUIMessage[],
  closet: Closet,
  aliases: AliasTable,
): StylistUIMessage[] {
  const byId = new Map(closet.items.map((i) => [i.id, i]));
  const lastUser = messages.findLastIndex((m) => m.role === "user");

  return messages.map((m, index) => {
    if (m.role !== "user") return m;
    const parts: StylistUIMessage["parts"] = m.parts.filter((p) => p.type === "text");
    const tagged = (m.metadata?.taggedItemIds ?? [])
      .map((id) => byId.get(id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .slice(0, 4);
    if (tagged.length) {
      parts.push({
        type: "text",
        text: `[Items tagged by the user: ${tagged.map((i) => describeItem(i, aliases, closet, true)).join(" | ")}]`,
      });
      if (index === lastUser) {
        for (const item of tagged.slice(0, LIMITS.maxPhotos)) {
          const photo = photoUrl(item);
          if (photo) parts.push({ type: "file", mediaType: photo.mediaType, url: photo.url } satisfies FileUIPart);
        }
      }
    }
    return { ...m, parts };
  });
}

// ── Agent ─────────────────────────────────────────────────────────────────────

const CHAT_TASK = `How to help in this chat:
- The user's closet is listed below by alias. Use getItemDetails when you need more about an item.
- When you recommend or refer to items they own, call showItems with their aliases so they appear as cards, then explain briefly. Don't list long item details in text.
- Tagged items are what the user is asking about.
- Keep replies short and practical. Use a short list for options.

Shopping (only when the user asks to buy, shop for, or find something online):
- Search with ${SEARCH_TOOL}, at most ${LIMITS.maxSearchesPerTurn} searches. Make queries specific: item type, color, style, and their budget (e.g. "men's olive hoodie under $60").
- Then call showProducts with 2–4 real options from the results: exact URLs from the results, price only if the result shows it, and a reason tied to their items.
- Never invent products, prices, stores or links. If the results don't have good options, say so.
- Don't search the web for anything that isn't shopping for clothing, shoes or accessories.`;

export function stylistInstructions(closet: Closet, aliases: AliasTable, summary: string | null) {
  // Stable text first (policy, task, closet) so providers can reuse cached prompt prefixes.
  return [
    STYLIST_POLICY,
    CHAT_TASK,
    `The user's closet:\n${closetIndex(closet, aliases)}`,
    summary ? `Summary of earlier messages in this chat:\n${summary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createStylistAgent({
  userId,
  closet,
  aliases,
  summary,
  tools,
  model = STYLIST_MODEL,
}: {
  userId: string;
  closet: Closet;
  aliases: AliasTable;
  summary: string | null;
  tools: StylistTools;
  model?: LanguageModel;
}) {
  return new ToolLoopAgent({
    model,
    instructions: stylistInstructions(closet, aliases, summary),
    tools,
    stopWhen: isStepCount(LIMITS.maxToolSteps),
    // Cap web searches per reply: once used up, the search tool is switched off.
    prepareStep: ({ steps }) => {
      const searches = steps.flatMap((s) => s.toolCalls).filter((c) => c.toolName === SEARCH_TOOL).length;
      return searches >= LIMITS.maxSearchesPerTurn
        ? { activeTools: ["getItemDetails", "showItems", "showProducts"] }
        : {};
    },
    maxOutputTokens: LIMITS.chatOutputTokens,
    reasoning: "minimal",
    maxRetries: 1,
    providerOptions: gatewayOptions(userId, "chat"),
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────

/** Fold messages that slid out of the window into the running summary. */
export async function summarizeMessages({
  userId,
  previous,
  messages,
  model = STYLIST_MODEL,
}: {
  userId: string;
  previous: string | null;
  messages: StylistUIMessage[];
  model?: LanguageModel;
}): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Stylist"}: ${messageText(m) || "(showed item cards)"}`)
    .join("\n")
    .slice(0, 6000);

  const { text } = await generateText({
    model,
    instructions:
      "Summarize this styling chat for your own later reference, in at most 5 short bullet points: what the user wants, their preferences, constraints (budget, occasion, sizes), and items already suggested (keep aliases like i12). No preamble.",
    prompt: `${previous ? `Existing summary:\n${previous}\n\n` : ""}New messages:\n${transcript}`,
    maxOutputTokens: 250,
    reasoning: "minimal",
    maxRetries: 1,
    providerOptions: gatewayOptions(userId, "chat-summary"),
  });
  return text.trim().slice(0, 1500);
}
