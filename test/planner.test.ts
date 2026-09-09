import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { setPlannedDay, savePlannedDayAsOutfit, toggleWeekBlock, swapPlannedDays } from "@/lib/actions";
import { getWeek, getWeekBlocks, getPlannedDay, getPlansForRange, addDays } from "@/lib/planner";
import { USER_A, USER_B } from "./setup";

const MONDAY = "2026-09-07";

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

function planForm(date: string, itemIds: string[], note?: string): FormData {
  const fd = new FormData();
  fd.set("date", date);
  if (note !== undefined) fd.set("note", note);
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

  it("saves a day note and updates it on re-save", async () => {
    const [a] = await seedItems(USER_A, ["Tee"]);
    await setPlannedDay(planForm(DATE, [a], "dinner with friends"));
    let plan = await getPlannedDay(DATE);
    expect(plan?.note).toBe("dinner with friends");

    await setPlannedDay(planForm(DATE, [a], "changed my mind"));
    plan = await getPlannedDay(DATE);
    expect(plan?.note).toBe("changed my mind");

    await setPlannedDay(planForm(DATE, [a], "")); // empty note clears it
    plan = await getPlannedDay(DATE);
    expect(plan?.note).toBeNull();
  });

  it("fetches a multi-week window in one map, keyed by date", async () => {
    const [a] = await seedItems(USER_A, ["Tee"]);
    await setPlannedDay(planForm(DATE, [a], "swim day"));
    // A day in the following week, to prove the range spans past one week.
    await setPlannedDay(planForm("2026-09-16", [a]));

    const range = await getPlansForRange(MONDAY, 3);
    expect(Object.keys(range).sort()).toEqual([DATE, "2026-09-16"]);
    expect(range[DATE].note).toBe("swim day");
    expect(range[DATE].items.map((i) => i.id)).toEqual([a]);

    // Weeks outside the window aren't included.
    expect(await getPlansForRange(addDays(MONDAY, 21), 1)).toEqual({});
  });

  it("swaps two days' outfits, carrying each note with its outfit", async () => {
    const [tee, jeans] = await seedItems(USER_A, ["Tee", "Jeans"]);
    const OTHER = "2026-09-10";
    await setPlannedDay(planForm(DATE, [tee], "gym day"));
    await setPlannedDay(planForm(OTHER, [jeans], "dinner out"));

    await swapPlannedDays(DATE, OTHER);

    const a = await getPlannedDay(DATE);
    const b = await getPlannedDay(OTHER);
    expect(a?.items.map((i) => i.itemId)).toEqual([jeans]);
    expect(a?.note).toBe("dinner out");
    expect(b?.items.map((i) => i.itemId)).toEqual([tee]);
    expect(b?.note).toBe("gym day");
  });

  it("swapping with an empty day just moves the plan there", async () => {
    const [tee] = await seedItems(USER_A, ["Tee"]);
    const EMPTY = "2026-09-11";
    await setPlannedDay(planForm(DATE, [tee], "gym day"));

    await swapPlannedDays(DATE, EMPTY);

    expect(await getPlannedDay(DATE)).toBeNull();
    const moved = await getPlannedDay(EMPTY);
    expect(moved?.items.map((i) => i.itemId)).toEqual([tee]);
    expect(moved?.note).toBe("gym day");
  });

  it("ignores item ids the user doesn't own", async () => {
    const [mine] = await seedItems(USER_A, ["Mine"]);
    const [theirs] = await seedItems(USER_B, ["Theirs"]);
    await setPlannedDay(planForm(DATE, [mine, theirs]));

    const plan = await prisma.plannedDay.findFirst({ where: { userId: USER_A, date: DATE }, include: { items: true } });
    expect(plan?.items.map((i) => i.itemId)).toEqual([mine]);
  });

  it("toggles a per-week no-repeat block on and off", async () => {
    const [a] = await seedItems(USER_A, ["Tee"]);
    const block = (id: string) => {
      const fd = new FormData();
      fd.set("week", MONDAY);
      fd.set("itemId", id);
      return toggleWeekBlock(fd);
    };
    await block(a);
    expect(await getWeekBlocks(MONDAY)).toEqual([a]);
    await block(a); // toggle off
    expect(await getWeekBlocks(MONDAY)).toEqual([]);
  });

  it("won't block an item the user doesn't own", async () => {
    const [theirs] = await seedItems(USER_B, ["Theirs"]);
    const fd = new FormData();
    fd.set("week", MONDAY);
    fd.set("itemId", theirs);
    await toggleWeekBlock(fd); // acting as USER_A
    expect(await getWeekBlocks(MONDAY)).toEqual([]);
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
