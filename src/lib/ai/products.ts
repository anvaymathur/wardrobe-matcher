import { storeName } from "@/lib/links";

// Shopping results are only trusted when they came back from a real web search
// in the same reply. These helpers are pure (no server imports) so the chat
// route (before saving) and the chat UI (before rendering) apply the same check.

export const SEARCH_TOOL = "perplexity_search";

export type ProductCard = {
  title: string;
  url: string;
  store: string;
  price: string | null;
  reason: string;
};

/** Comparable form of a URL: host without "www." plus path, ignoring query,
 * hash and trailing slashes (models often trim tracking params). */
export function urlKey(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

type LoosePart = { type: string; state?: string; output?: unknown };

/** Every URL returned by web searches in a message: key → the URL as found. */
export function searchResultUrls(parts: readonly LoosePart[]): Map<string, string> {
  const found = new Map<string, string>();
  for (const part of parts) {
    if (part.type !== `tool-${SEARCH_TOOL}` || part.state !== "output-available") continue;
    const results = (part.output as { results?: unknown } | undefined)?.results;
    if (!Array.isArray(results)) continue;
    for (const r of results) {
      const url = (r as { url?: unknown })?.url;
      const key = typeof url === "string" ? urlKey(url) : null;
      if (key && !found.has(key)) found.set(key, url as string);
    }
  }
  return found;
}

/** Keep only products whose link matches a search result, using the result's
 * own URL and the store name from its domain (not whatever the model claimed). */
export function verifyProducts(products: readonly ProductCard[], found: Map<string, string>): ProductCard[] {
  const seen = new Set<string>();
  const out: ProductCard[] = [];
  for (const p of products) {
    const key = urlKey(p.url);
    const real = key ? found.get(key) : undefined;
    if (!key || !real || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...p, url: real, store: storeName(real) });
  }
  return out;
}

/** A message with unverifiable product cards removed and search snippets
 * trimmed (they're only needed for verification, not re-reading). */
export function withVerifiedProducts<M extends { parts: LoosePart[] }>(message: M): M {
  const found = searchResultUrls(message.parts);
  return {
    ...message,
    parts: message.parts.map((part) => {
      if (part.state !== "output-available") return part;
      if (part.type === "tool-showProducts") {
        const products = (part.output as { products?: ProductCard[] } | undefined)?.products ?? [];
        return { ...part, output: { products: verifyProducts(products, found) } };
      }
      if (part.type === `tool-${SEARCH_TOOL}`) {
        const output = part.output as { results?: { snippet?: string }[] } | undefined;
        if (!Array.isArray(output?.results)) return part;
        return {
          ...part,
          output: { ...output, results: output.results.map((r) => ({ ...r, snippet: r.snippet?.slice(0, 200) })) },
        };
      }
      return part;
    }),
  };
}
