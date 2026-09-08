import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { setPlannedDay, savePlannedDayAsOutfit } from "@/lib/actions";
import { getWeek } from "@/lib/planner";
import { USER_A, USER_B } from "./setup";

const DATE = "2026-09-08";

async function seedItems(userId: string, names: string[]) {
  const ids: string[] = [];
  for (const name of names) {
    const it = await prisma.item.create({
      data: { name, category: "TOP", subtype: "tee", userId },
    });
    ids.push(it.id);
  }
  return ids;
}

function planForm(date: string, itemIds: string[]): FormData {
  const fd = new FormData();
  fd.set("date", date);
  for (const id of itemIds) fd.append("itemId", id);
  return fd;
}

describe("weekly planner", () => {
  it("sets a day's plan, then getWeek returns it on the right date", async () => {
    const [a, b] = await seedItems(USER_A, ["Tee", "Jeans"]);
    await setPlannedDay(planForm(DATE, [a, b]));

    const week = await getWeek("2026-09-07"); // Monday of that week
    const day = week.find((d) => d.date === DATE);
    expect(day?.plan?.items.map((i) => i.itemId).sort()).toEqual([a, b].sort());
    expect(week).toHaveLength(7);
  });

  it("re-saving replaces the day's items; saving empty clears the day", async () => {
    const [a, b] = await seedItems(USER_A, ["Tee", "Jeans"]);
    await setPlannedDay(planForm(DATE, [a, b]));
    await setPlannedDay(planForm(DATE, [a])); // replace

    let plan = await prisma.plannedDay.findFirst({ where: { userId: USER_A, date: DATE }, include: { items: true } });
    expect(plan?.items.map((i) => i.itemId)).toEqual([a]);

    await setPlannedDay(planForm(DATE, [])); // clear
    plan = await prisma.plannedDay.findFirst({ where: { userId: USER_A, date: DATE }, include: { items: true } });
    expect(plan).toBeNull();
  });

  it("ignores item ids the user doesn't own", async () => {
    const [mine] = await seedItems(USER_A, ["Mine"]);
    const [theirs] = await seedItems(USER_B, ["Theirs"]);
    await setPlannedDay(planForm(DATE, [mine, theirs]));

    const plan = await prisma.plannedDay.findFirst({ where: { userId: USER_A, date: DATE }, include: { items: true } });
    expect(plan?.items.map((i) => i.itemId)).toEqual([mine]);
  });

  it("saves a planned day to the Outfits tab", async () => {
    const [a, b] = await seedItems(USER_A, ["Tee", "Jeans"]);
    await setPlannedDay(planForm(DATE, [a, b]));

    const fd = new FormData();
    fd.set("date", DATE);
    fd.set("name", "Mon · Sep 8");
    await savePlannedDayAsOutfit(fd);

    const outfit = await prisma.outfit.findFirst({ where: { name: "Mon · Sep 8" }, include: { items: true } });
    expect(outfit?.userId).toBe(USER_A);
    expect(outfit?.items.map((i) => i.itemId).sort()).toEqual([a, b].sort());
  });
});
