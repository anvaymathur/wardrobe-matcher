import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { suggestOutfitsFor } from "@/lib/ai/suggestOutfits";
import { AliasTable, loadCloset } from "@/lib/ai/closet";
import { AiUserError } from "@/lib/ai/guard";
import { jsonModel, promptText } from "./aiMock";
import { USER_A, USER_B } from "./setup";

async function seed() {
  const mk = (name: string, category: string, userId = USER_A) =>
    prisma.item.create({ data: { name, category, subtype: name.toLowerCase(), userId } });
  const tee = await mk("Tee", "TOP");
  const shirt = await mk("Shirt", "TOP");
  const jeans = await mk("Jeans", "BOTTOM");
  const boots = await mk("Boots", "SHOES");
  const theirs = await mk("Their jacket", "OUTERWEAR", USER_B);
  const aliases = new AliasTable((await loadCloset(USER_A)).items.map((i) => i.id));
  const a = (item: { id: string }) => aliases.alias(item.id)!;
  return { tee, shirt, jeans, boots, theirs, a };
}

describe("AI outfit ideas", () => {
  it("enforces one item per type, drops unknown items, needs 2+ pieces, and dedupes", async () => {
    const { tee, shirt, jeans, boots, a } = await seed();
    const model = jsonModel({
      outfits: [
        // two tops: only the first one listed is kept
        { name: "Casual", items: [a(tee), a(shirt), a(jeans), "i999"], reason: "Easy weekend look" },
        // same outfit again (different order) → dropped as a duplicate
        { name: "Casual again", items: [a(jeans), a(tee)], reason: "dup" },
        // only one real piece → dropped
        { name: "Too thin", items: [a(boots), "i404"], reason: "nope" },
        { name: "Sharp", items: [a(shirt), a(jeans), a(boots)], reason: "Crisp and simple" },
      ],
    });

    const ideas = await suggestOutfitsFor(USER_A, {}, model);
    expect(ideas.map((i) => i.name)).toEqual(["Casual", "Sharp"]);
    expect(ideas[0].itemIds).toEqual([tee.id, jeans.id]); // ordered head-to-toe by type
    expect(ideas[1].itemIds).toEqual([shirt.id, jeans.id, boots.id]);
  });

  it("builds every idea around the anchors, even if the model swaps them out", async () => {
    const { tee, shirt, jeans, a } = await seed();
    const model = jsonModel({ outfits: [{ name: "Swapped", items: [a(shirt), a(jeans)], reason: "x" }] });

    const [idea] = await suggestOutfitsFor(USER_A, { anchorItemIds: [tee.id] }, model);
    expect(idea.itemIds).toEqual([tee.id, jeans.id]);
    expect(promptText(model)).toContain("Must include");
  });

  it("ignores anchors the user doesn't own and keeps other users' items out of the prompt", async () => {
    const { theirs } = await seed();
    const model = jsonModel({ outfits: [] });
    await suggestOutfitsFor(USER_A, { anchorItemIds: [theirs.id], brief: "  dinner   out " }, model);

    const prompt = promptText(model);
    expect(prompt).not.toContain("Their jacket");
    expect(prompt).not.toContain("Must include");
    expect(prompt).toContain("dinner out"); // brief whitespace collapsed
  });

  it("asks for more items instead of calling the model on a near-empty closet", async () => {
    await prisma.item.create({ data: { name: "Tee", category: "TOP", subtype: "tee", userId: USER_A } });
    const model = jsonModel({ outfits: [] });
    await expect(suggestOutfitsFor(USER_A, {}, model)).rejects.toBeInstanceOf(AiUserError);
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});
