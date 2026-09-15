import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { suggestMatchesFor } from "@/lib/ai/suggestMatches";
import { AiUserError } from "@/lib/ai/guard";
import { AliasTable, loadCloset } from "@/lib/ai/closet";
import { jsonModel, promptText } from "./aiMock";
import { USER_A, USER_B } from "./setup";

async function seed() {
  const mk = (name: string, category: string, userId = USER_A, imagePath: string | null = null) =>
    prisma.item.create({ data: { name, category, subtype: name.toLowerCase(), userId, imagePath } });
  const tee = await mk("Tee", "TOP", USER_A, "https://abc.public.blob.vercel-storage.com/tee.jpg");
  const hoodie = await mk("Hoodie", "TOP");
  const jeans = await mk("Jeans", "BOTTOM");
  const chinos = await mk("Chinos", "BOTTOM");
  const boots = await mk("Boots", "SHOES");
  const theirs = await mk("Their pants", "BOTTOM", USER_B);
  // Tee already goes with the chinos.
  const [a, b] = [tee.id, chinos.id].sort();
  await prisma.pairing.create({ data: { itemAId: a, itemBId: b, tier: 1, userId: USER_A } });
  return { tee, hoodie, jeans, chinos, boots, theirs };
}

describe("AI match suggestions", () => {
  it("keeps only real candidates: drops made-up, same-type, already-matched and duplicate picks", async () => {
    const { tee, hoodie, jeans, chinos, boots } = await seed();

    // Aliases are assigned in closet order, same as the prompt uses.
    const aliases = new AliasTable((await loadCloset(USER_A)).items.map((i) => i.id));
    const [jeansA, bootsA, hoodieA, chinosA] = [jeans, boots, hoodie, chinos].map((i) => aliases.alias(i.id)!);

    const model = jsonModel({
      suggestions: [
        { item: jeansA, strength: 1, reason: "Classic denim with a white tee" },
        { item: "i999", strength: 1, reason: "made up" },
        { item: hoodieA, strength: 2, reason: "same type as a tee" },
        { item: chinosA, strength: 1, reason: "already matched" },
        { item: jeansA, strength: 2, reason: "duplicate" },
        { item: bootsA, strength: 7, reason: "strength out of range" },
      ],
    });
    const result = await suggestMatchesFor(USER_A, tee.id, model);

    expect(result.map((s) => s.itemId)).toEqual([jeans.id, boots.id]);
    expect(result[1].strength).toBe(3); // clamped
  });

  it("never sends real ids or other users' items, and attaches the anchor photo", async () => {
    const { tee, theirs } = await seed();
    const model = jsonModel({ suggestions: [] });
    await suggestMatchesFor(USER_A, tee.id, model);

    const prompt = promptText(model);
    expect(prompt).not.toContain(tee.id);
    expect(prompt).not.toContain("Their pants");
    expect(prompt).not.toContain(theirs.id);
    expect(prompt).toContain("tee.jpg"); // the one photo in focus
  });

  it("refuses items the user doesn't own", async () => {
    const { theirs } = await seed();
    await expect(suggestMatchesFor(USER_A, theirs.id, jsonModel({ suggestions: [] }))).rejects.toBeInstanceOf(
      AiUserError,
    );
  });

  it("skips the model entirely when there's nothing left to match", async () => {
    const lonely = await prisma.item.create({
      data: { name: "Only item", category: "TOP", subtype: "tee", userId: USER_A },
    });
    const model = jsonModel({ suggestions: [] });
    expect(await suggestMatchesFor(USER_A, lonely.id, model)).toEqual([]);
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});
