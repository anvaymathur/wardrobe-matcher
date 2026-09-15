import { describe, it, expect } from "vitest";
import {
  SEARCH_TOOL,
  searchResultUrls,
  urlKey,
  verifyProducts,
  withVerifiedProducts,
  type ProductCard,
} from "@/lib/ai/products";

const searchPart = (urls: string[]) => ({
  type: `tool-${SEARCH_TOOL}`,
  state: "output-available",
  output: { id: "s1", results: urls.map((url) => ({ title: "t", url, snippet: "x".repeat(900) })) },
});

const product = (url: string, over: Partial<ProductCard> = {}): ProductCard => ({
  title: "Olive Hoodie",
  url,
  store: "made-up store",
  price: "$49",
  reason: "Goes with your jeans",
  ...over,
});

describe("shopping link verification", () => {
  it("compares URLs by host and path, ignoring www, query, hash and trailing slash", () => {
    expect(urlKey("https://www.uniqlo.com/us/hoodie/?utm=1#top")).toBe("uniqlo.com/us/hoodie");
    expect(urlKey("javascript:alert(1)")).toBeNull();
    expect(urlKey("not a url")).toBeNull();
  });

  it("keeps only products found in the search, with the real URL and store name", () => {
    const found = searchResultUrls([
      searchPart(["https://www.uniqlo.com/us/hoodie?color=olive", "https://gap.com/p/123"]),
      { type: "text", state: "done" },
    ]);
    const result = verifyProducts(
      [
        product("https://uniqlo.com/us/hoodie"), // trimmed params → matches
        product("https://totally-real-shop.com/hoodie"), // not in results → dropped
        product("https://www.uniqlo.com/us/hoodie/"), // duplicate → dropped
        product("https://gap.com/p/123", { price: null }),
      ],
      found,
    );
    expect(result.map((p) => p.url)).toEqual(["https://www.uniqlo.com/us/hoodie?color=olive", "https://gap.com/p/123"]);
    expect(result.map((p) => p.store)).toEqual(["uniqlo.com", "gap.com"]);
  });

  it("finds nothing when the search hasn't finished or failed", () => {
    expect(searchResultUrls([{ ...searchPart(["https://a.com/x"]), state: "input-available" }]).size).toBe(0);
    expect(
      searchResultUrls([{ type: `tool-${SEARCH_TOOL}`, state: "output-available", output: { error: "rate_limit" } }]).size,
    ).toBe(0);
  });

  it("cleans a whole message before saving: drops unverified cards, trims search snippets", () => {
    const message = {
      id: "a1",
      role: "assistant",
      parts: [
        searchPart(["https://gap.com/p/123"]),
        {
          type: "tool-showProducts",
          state: "output-available",
          output: { products: [product("https://gap.com/p/123"), product("https://fake.example/x")] },
        },
      ],
    };
    const cleaned = withVerifiedProducts(message);
    const cards = cleaned.parts[1].output as { products: ProductCard[] };
    expect(cards.products.map((p) => p.url)).toEqual(["https://gap.com/p/123"]);
    const results = (cleaned.parts[0].output as { results: { snippet: string }[] }).results;
    expect(results[0].snippet.length).toBe(200);
  });
});
