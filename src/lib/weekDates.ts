// Pure date math for the planner — no database imports, so client components
// (the week carousel) can compute day keys and labels without a round trip.
//
// A "day key" is a timezone-free calendar day, "YYYY-MM-DD". All date math runs
// in UTC so it never drifts across DST; only todayKey() reads the local calendar.

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToKey(d);
}

export function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The Monday of the week containing `key`. */
export function weekStartKey(key: string): string {
  const dow = keyToDate(key).getUTCDay(); // 0=Sun … 6=Sat
  const sinceMonday = (dow + 6) % 7;
  return addDays(key, -sinceMonday);
}

export function isValidKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(keyToDate(key).getTime());
}

const dayNameFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const monthDayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const dayName = (key: string) => dayNameFmt.format(keyToDate(key));
export const monthDay = (key: string) => monthDayFmt.format(keyToDate(key));
export const weekLabel = (startKey: string) =>
  `${monthDayFmt.format(keyToDate(startKey))} – ${monthDayFmt.format(keyToDate(addDays(startKey, 6)))}`;

/** The 7 day keys of the week starting at `startKey` (a Monday). */
export const weekDays = (startKey: string) =>
  Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
