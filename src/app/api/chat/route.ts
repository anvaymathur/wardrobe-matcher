import { after } from "next/server";
import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  toUIMessageStream,
} from "ai";
import { getCurrentUserId } from "@/lib/currentUser";
import { appendMessage, getThread, updateSummary } from "@/lib/chat";
import { AliasTable, loadCloset } from "@/lib/ai/closet";
import { consumeAiQuota, friendlyAiError } from "@/lib/ai/guard";
import { LIMITS } from "@/lib/ai/models";
import { SEARCH_TOOL, withVerifiedProducts } from "@/lib/ai/products";
import {
  chatMetadataSchema,
  createStylistAgent,
  createStylistTools,
  messageText,
  selectHistory,
  summarizeMessages,
  summaryTarget,
  withTaggedItems,
  type StylistUIMessage,
} from "@/lib/ai/stylistChat";

export const maxDuration = 60;

// useChat shows the response body as the error message, so keep it plain text.
const fail = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return fail("Please sign in again.", 401);

  let body: { id?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("That message couldn't be read.", 400);
  }
  if (typeof body.id !== "string" || typeof body.message !== "object" || body.message === null) {
    return fail("That message couldn't be read.", 400);
  }

  const thread = await getThread(userId, body.id);
  if (!thread) return fail("That chat couldn't be found.", 404);
  if (thread.messages.length >= LIMITS.maxThreadMessages) {
    return fail("This chat is full — start a new chat to keep going.", 400);
  }

  const closet = await loadCloset(userId);
  const aliases = new AliasTable(closet.items.map((i) => i.id));
  const tools = createStylistTools(closet, aliases);

  // The incoming message is untrusted: validate its shape, keep only text, and
  // only tag items this user owns.
  const parsed = await safeValidateUIMessages<StylistUIMessage>({
    messages: [body.message],
    metadataSchema: chatMetadataSchema,
  });
  if (!parsed.success || parsed.data[0].role !== "user") return fail("That message couldn't be read.", 400);
  const owned = new Set(closet.items.map((i) => i.id));
  const raw = parsed.data[0];
  const incoming: StylistUIMessage = {
    id: raw.id,
    role: "user",
    parts: raw.parts.filter((p) => p.type === "text"),
    metadata: { taggedItemIds: (raw.metadata?.taggedItemIds ?? []).filter((id) => owned.has(id)) },
  };
  const text = messageText(incoming);
  if (!text) return fail("Type a message first.", 400);
  if (text.length > LIMITS.maxMessageChars) {
    return fail(`Please keep messages under ${LIMITS.maxMessageChars} characters.`, 400);
  }

  try {
    await consumeAiQuota(userId);
  } catch (err) {
    return fail(friendlyAiError(err), 429);
  }

  const position = thread.messages.length;
  await appendMessage(thread.id, position, incoming);

  // Stored history is ours, but re-validate against the current tool schemas in
  // case they changed; if it no longer fits, carry on with just the summary.
  const history = await safeValidateUIMessages<StylistUIMessage>({
    messages: thread.messages,
    metadataSchema: chatMetadataSchema,
    tools,
  });
  // Earlier search results aren't resent: they're bulky (billed as input every
  // turn) and the product cards already record what was recommended.
  const recent = (history.success ? selectHistory(history.data, thread.summarizedCount) : []).map((m) => ({
    ...m,
    parts: m.parts.filter((p) => p.type !== `tool-${SEARCH_TOOL}`),
  }));

  const modelMessages = await convertToModelMessages(withTaggedItems([...recent, incoming], closet, aliases), {
    tools,
    ignoreIncompleteToolCalls: true,
  });
  const agent = createStylistAgent({ userId, closet, aliases, summary: thread.summary, tools });

  // Summarize after the response has finished streaming, so it never slows the reply.
  let saved!: () => void;
  const responseSaved = new Promise<void>((resolve) => (saved = resolve));
  after(async () => {
    await Promise.race([responseSaved, new Promise((r) => setTimeout(r, (maxDuration - 5) * 1000))]);
    try {
      const fresh = await getThread(userId, thread.id);
      if (!fresh) return;
      const target = summaryTarget(fresh.messages.length, fresh.summarizedCount);
      if (target === null) return;
      const summary = await summarizeMessages({
        userId,
        previous: fresh.summary,
        messages: fresh.messages.slice(fresh.summarizedCount, target),
      });
      await updateSummary(thread.id, summary, target);
    } catch (err) {
      console.error("[chat] summary failed", err);
    }
  });

  try {
    const result = await agent.stream({ messages: modelMessages });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream<typeof tools, StylistUIMessage>({
        stream: result.stream,
        tools,
        originalMessages: [incoming],
        generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
        onError: friendlyAiError,
        onEnd: async ({ responseMessage }) => {
          try {
            if (responseMessage.parts.length) {
              await appendMessage(thread.id, position + 1, withVerifiedProducts(responseMessage));
            }
          } finally {
            saved();
          }
        },
      }),
    });
  } catch (err) {
    saved();
    return fail(friendlyAiError(err), 500);
  }
}
