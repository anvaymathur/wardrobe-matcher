import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** A fake model that answers every call with `json`, and records the prompts it
 * was sent (`model.doGenerateCalls`). URLs pass through untouched, so tests
 * never download item photos. */
export function jsonModel(json: unknown) {
  return new MockLanguageModelV4({
    supportedUrls: { "image/*": [/.*/] },
    doGenerate: async () => ({
      content: [{ type: "text", text: JSON.stringify(json) }],
      finishReason: { unified: "stop", raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

/** Everything the model was shown on its first call, flattened to one string. */
export function promptText(model: MockLanguageModelV4): string {
  return JSON.stringify(model.doGenerateCalls[0]?.prompt ?? []);
}
