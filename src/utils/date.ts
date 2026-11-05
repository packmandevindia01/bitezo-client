/**
 * Date helpers that use the user's LOCAL calendar day.
 *
 * `new Date().toISOString().split("T")[0]` gives the UTC date. In Bahrain / GCC (UTC+3) that is
 * YESTERDAY between 00:00 and 03:00 (India: before 05:30), so bills, vouchers and report defaults
 * got the wrong business date. Always use these helpers for "today" / date-only values.
 */

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** yyyy-MM-dd of the given moment in LOCAL time (default: now). */
export const toLocalDateString = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** yyyy-MM-dd of the first day of the given moment's LOCAL month. */
export const firstOfMonthLocalString = (d: Date = new Date()): string =>
  toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));

/**
 * UTC ISO timestamp for a chosen LOCAL calendar day at the current LOCAL time of day.
 * Replaces `${date}T${now.toISOString().split("T")[1]}`, which glued a local date to a UTC time
 * and shifted the instant by a whole day around midnight.
 */
export const localDateAtCurrentTimeIso = (dateStr: string, now: Date = new Date()): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return now.toISOString();
  return new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  ).toISOString();
};
