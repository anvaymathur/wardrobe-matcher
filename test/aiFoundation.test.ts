import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { readProductLink, storeName } from "@/lib/links";
import { AliasTable, closetIndex, describeItem, imagePart, loadCloset, type AiItem } from "@/lib/ai/closet";
import { AiUserError, consumeAiQuota, friendlyAiError } from "@/lib/ai/guard";
import { LIMITS } from "@/lib/ai/models";
import { USER_A, USER_B } from "./setup";

const item = (over: Partial<AiItem> = {}): AiItem => ({
  id: "id-1",
  name: "White Oxford",
  category: "TOP",
  subtype: "oxford shirt",
  color: "white",
  notes: null,
  sourceUrl: null,
  imagePath: null,
  favorite: false,
  ...over,
});

describe("product links", () => {
  it("accepts http(s), rejects other schemes and junk, treats empty as none", () => {
    expect(readProductLink("https://uniqlo.com/shirt")).toBe("https://uniqlo.com/shirt");
    expect(readProductLink("  ")).toBeNull();
    expect(readProductLink("javascript:alert(1)")).toBe(false);
    expect(readProductLink("not a url")).toBe(false);
    expect(storeName("https://www.uniqlo.com/x")).toBe("uniqlo.com");
  });
});

describe("closet prompt context", () => {
  it("maps aliases both ways and rejects made-up aliases", () => {
    const t = new AliasTable(["a", "b"]);
    expect(t.alias("b")).toBe("i2");
    expect(t.id("I1")).toBe("a");
    expect(t.id("i99")).toBeUndefined();
  });

  it("describes items compactly with matches, and groups the index by type", async () => {
    const [top, jeans, other] = await Promise.all([
      prisma.item.create({ data: { name: "Tee", category: "TOP", subtype: "tee", color: "black", userId: USER_A } }),
      prisma.item.create({ data: { name: "Jeans", category: "BOTTOM", subtype: "jeans", userId: USER_A } }),
      prisma.item.create({ data: { name: "Not mine", category: "TOP", subtype: "tee", userId: USER_B } }),
    ]);
    const [a, b] = [top.id, jeans.id].sort();
    await prisma.pairing.create({ data: { itemAId: a, itemBId: b, tier: 1, userId: USER_A } });

    const closet = await loadCloset(USER_A);
    expect(closet.items.map((i) => i.id)).not.toContain(other.id);

    const aliases = new AliasTable(closet.items.map((i) => i.id));
    const line = describeItem(closet.items.find((i) => i.id === top.id)!, aliases, closet);
    expect(line).toContain("TOP/tee");
    expect(line).toContain("black");
    expect(line).toMatch(/goes with i\d\(best\)/);
    expect(line).not.toContain(top.id); // real ids never go into prompts

    const index = closetIndex(closet, aliases);
    expect(index.indexOf("TOP:")).toBeLessThan(index.indexOf("BOTTOM:"));
  });

  it("only sends photos hosted on our Blob store", () => {
    expect(imagePart(item({ imagePath: "https://abc.public.blob.vercel-storage.com/x.jpg" }))).not.toBeNull();
    expect(imagePart(item({ imagePath: "https://evil.example.com/x.jpg" }))).toBeNull();
    expect(imagePart(item({ imagePath: "/uploads/local.jpg" }))).toBeNull();
    expect(imagePart(item())).toBeNull();
  });
});

describe("AI quota", () => {
  it("allows the daily limit, blocks the next request, and resets the next day", async () => {
    const day = new Date("2026-09-14T10:00:00Z");
    for (let i = 0; i < LIMITS.dailyRequests; i++) await consumeAiQuota(USER_A, day);
    await expect(consumeAiQuota(USER_A, day)).rejects.toBeInstanceOf(AiUserError);
    await expect(consumeAiQuota(USER_B, day)).resolves.toBeUndefined(); // per user
    await expect(consumeAiQuota(USER_A, new Date("2026-09-15T00:01:00Z"))).resolves.toBeUndefined();
  });

  it("turns gateway failures into friendly messages", () => {
    expect(friendlyAiError(Object.assign(new Error("x"), { statusCode: 402 }))).toMatch(/credits/);
    expect(friendlyAiError(Object.assign(new Error("x"), { statusCode: 429 }))).toMatch(/busy/);
    expect(friendlyAiError(new AiUserError("custom"))).toBe("custom");
  });
});
