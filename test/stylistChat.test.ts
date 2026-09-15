import { describe, it, expect, vi, beforeEach } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { prisma } from "@/lib/prisma";
import { AliasTable, loadCloset } from "@/lib/ai/closet";
import { LIMITS } from "@/lib/ai/models";
import {
  createStylistTools,
  selectHistory,
  summaryTarget,
  withTaggedItems,
  type ShownItem,
  type StylistUIMessage,
} from "@/lib/ai/stylistChat";
import { appendMessage, createThread, deleteThread, getThread, listThreads } from "@/lib/chat";
import { setCurrentUser, USER_A, USER_B } from "./setup";

// The route runs work in next/server's `after()` and uses the configured model;
// swap both for test doubles.
const hoisted = vi.hoisted(() => ({
  model: null as unknown,
  afters: [] as (() => Promise<void> | void)[],
}));
vi.mock("next/server", () => ({ after: (fn: () => void) => hoisted.afters.push(fn) }));
vi.mock("@/lib/ai/models", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/models")>();
  return {
    ...actual,
    get STYLIST_MODEL() {
      return hoisted.model;
    },
  };
});

const { POST } = await import("@/app/api/chat/route");

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
const finish = (reason: "stop" | "tool-calls") => ({
  type: "finish" as const,
  finishReason: { unified: reason, raw: undefined },
  usage,
});

/** A model whose successive stream calls play `steps`, and whose generate call
 * (used for summaries) returns `summary`. */
function scriptedModel(steps: unknown[][], summary = "- likes neutral colors") {
  return new MockLanguageModelV4({
    supportedUrls: { "image/*": [/.*/] },
    doStream: steps.map((chunks) => ({ stream: simulateReadableStream({ chunks: chunks as never[] }) })),
    doGenerate: async () => ({
      content: [{ type: "text", text: summary }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

const textReply = (text: string) => [
  { type: "text-start", id: "t" },
  { type: "text-delta", id: "t", delta: text },
  { type: "text-end", id: "t" },
  finish("stop"),
];

const userMessage = (text: string, taggedItemIds: string[] = []): StylistUIMessage => ({
  id: `u-${Math.random().toString(36).slice(2)}`,
  role: "user",
  parts: [{ type: "text", text }],
  metadata: { taggedItemIds },
});

const post = (body: unknown) =>
  POST(new Request("http://test/api/chat", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  hoisted.afters.length = 0;
  hoisted.model = scriptedModel([textReply("ok")]);
});

async function seedCloset() {
  const tee = await prisma.item.create({
    data: {
      name: "Grey Tee",
      category: "TOP",
      subtype: "tee",
      userId: USER_A,
      imagePath: "https://x.public.blob.vercel-storage.com/tee.png",
    },
  });
  const jeans = await prisma.item.create({ data: { name: "Jeans", category: "BOTTOM", subtype: "jeans", userId: USER_A } });
  const theirs = await prisma.item.create({ data: { name: "Secret Jacket", category: "OUTERWEAR", subtype: "jacket", userId: USER_B } });
  const closet = await loadCloset(USER_A);
  const aliases = new AliasTable(closet.items.map((i) => i.id));
  return { tee, jeans, theirs, closet, aliases };
}

describe("chat context helpers", () => {
  it("resends only the recent window not covered by the summary, starting on a user turn", () => {
    const msgs = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", n: i }));
    expect(selectHistory(msgs, 0, 8).map((m) => m.n)).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
    // A window that would start on an assistant message drops it.
    expect(selectHistory(msgs, 0, 7).map((m) => m.n)).toEqual([6, 7, 8, 9, 10, 11]);
    // Messages already folded into the summary are never resent.
    expect(selectHistory(msgs, 10, 8).map((m) => m.n)).toEqual([10, 11]);
  });

  it("knows when older messages need summarizing", () => {
    expect(summaryTarget(8, 0, 8)).toBeNull();
    expect(summaryTarget(12, 0, 8)).toBe(4);
    expect(summaryTarget(12, 4, 8)).toBeNull();
  });

  it("adds tagged item details, photos only on the newest message, and strips non-text parts", async () => {
    const { tee, theirs, closet, aliases } = await seedCloset();
    const older: StylistUIMessage = userMessage("earlier", [tee.id]);
    const newest: StylistUIMessage = {
      ...userMessage("now", [tee.id, theirs.id]),
      parts: [
        { type: "text", text: "now" },
        { type: "file", mediaType: "image/png", url: "https://evil.example.com/x.png" },
      ],
    };
    const [a, b] = withTaggedItems([older, newest], closet, aliases);

    expect(JSON.stringify(a.parts)).toContain("Items tagged by the user");
    expect(a.parts.some((p) => p.type === "file")).toBe(false); // no photo on older turns
    const files = b.parts.filter((p) => p.type === "file");
    expect(files).toEqual([{ type: "file", mediaType: "image/png", url: tee.imagePath }]);
    expect(JSON.stringify(b.parts)).not.toContain("evil.example.com");
    expect(JSON.stringify(b.parts)).not.toContain("Secret Jacket");
  });

  it("showItems only resolves the user's own items and keeps real ids out of the model's view", async () => {
    const { tee, closet, aliases } = await seedCloset();
    const tools = createStylistTools(closet, aliases);
    const ctx = { toolCallId: "c1", messages: [], context: {} } as never;

    // execute may be typed as streaming; this tool returns a plain object.
    const out = (await tools.showItems.execute!(
      { items: [aliases.alias(tee.id)!, "i999", aliases.alias(tee.id)!] },
      ctx,
    )) as { caption: string | null; items: ShownItem[] };
    expect(out.items.map((i) => i.id)).toEqual([tee.id]);

    const modelView = await tools.showItems.toModelOutput!({ toolCallId: "c1", input: { items: [] }, output: out });
    expect(JSON.stringify(modelView)).not.toContain(tee.id);
  });
});

describe("chat persistence", () => {
  it("scopes threads to their owner and titles them from the first message", async () => {
    const id = await createThread(USER_A);
    await appendMessage(id, 0, userMessage("What goes with grey?"));

    expect((await getThread(USER_A, id))?.title).toBe("What goes with grey?");
    expect(await getThread(USER_B, id)).toBeNull();
    expect((await listThreads(USER_A)).map((t) => t.id)).toEqual([id]);
    expect(await listThreads(USER_B)).toEqual([]);

    await deleteThread(USER_B, id); // not theirs → no-op
    expect(await getThread(USER_A, id)).not.toBeNull();
  });
});

describe("POST /api/chat", () => {
  it("streams a reply, runs closet tools, and saves both messages", async () => {
    const { tee, theirs, aliases } = await seedCloset();
    const threadId = await createThread(USER_A);
    const model = scriptedModel([
      [
        { type: "tool-call", toolCallId: "c1", toolName: "showItems", input: JSON.stringify({ items: [aliases.alias(tee.id)] }) },
        finish("tool-calls"),
      ],
      textReply("That grey tee works great."),
    ]);
    hoisted.model = model;

    const res = await post({ id: threadId, message: userMessage("What should I wear?", [tee.id, theirs.id]) });
    expect(res.status).toBe(200);
    await res.text(); // drain the stream so the reply is saved

    const thread = await getThread(USER_A, threadId);
    expect(thread?.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(thread?.messages[0].metadata?.taggedItemIds).toEqual([tee.id]); // other user's item dropped
    const shown = thread?.messages[1].parts.find((p) => p.type === "tool-showItems");
    expect(shown && "output" in shown && shown.output?.items.map((i) => i.id)).toEqual([tee.id]);

    const firstPrompt = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(firstPrompt).toContain("Items tagged by the user");
    expect(firstPrompt).toContain("tee.png"); // photo of the tagged item
    expect(firstPrompt).not.toContain("Secret Jacket");
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).not.toContain(tee.id);
  });

  it("rejects signed-out users, other people's threads, and over-long messages", async () => {
    const threadId = await createThread(USER_A);

    setCurrentUser(null);
    expect((await post({ id: threadId, message: userMessage("hi") })).status).toBe(401);

    setCurrentUser(USER_B);
    expect((await post({ id: threadId, message: userMessage("hi") })).status).toBe(404);

    setCurrentUser(USER_A);
    const long = await post({ id: threadId, message: userMessage("x".repeat(LIMITS.maxMessageChars + 1)) });
    expect(long.status).toBe(400);
    expect(await long.text()).toMatch(/characters/);
    expect((await getThread(USER_A, threadId))?.messages).toHaveLength(0);
  });

  it("stops at the daily limit without calling the model", async () => {
    const threadId = await createThread(USER_A);
    await prisma.aiUsage.create({
      data: { userId: USER_A, day: new Date().toISOString().slice(0, 10), count: LIMITS.dailyRequests },
    });
    const model = scriptedModel([textReply("should not run")]);
    hoisted.model = model;

    const res = await post({ id: threadId, message: userMessage("hi") });
    expect(res.status).toBe(429);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("folds older messages into a summary after the reply once the window overflows", async () => {
    const threadId = await createThread(USER_A);
    for (let i = 0; i < LIMITS.historyWindow; i++) {
      const msg: StylistUIMessage =
        i % 2 === 0 ? userMessage(`q${i}`) : { id: `a${i}`, role: "assistant", parts: [{ type: "text", text: `a${i}` }] };
      await appendMessage(threadId, i, msg);
    }
    hoisted.model = scriptedModel([textReply("sure")], "- wants office outfits");

    const res = await post({ id: threadId, message: userMessage("next question") });
    await res.text();
    for (const fn of hoisted.afters) await fn();

    const thread = await getThread(USER_A, threadId);
    expect(thread?.messages).toHaveLength(LIMITS.historyWindow + 2);
    expect(thread?.summary).toBe("- wants office outfits");
    expect(thread?.summarizedCount).toBe(2);
  });
});
