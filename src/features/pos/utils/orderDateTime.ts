/**
 * Order date + time for the Recall / Settled previews (and the Dine-In order cards, which use the Recall ticket):
 * "dd/MM/yyyy hh:mm:ss AM/PM" (2026-11-14: was 24-hour; the prints were already AM/PM).
 * A bare time from the recall list text ("7:46:02 PM") gets today's date. Anything else unreadable is shown as is.
 */
const pad = (n: number) => String(n).padStart(2, "0");

const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export const formatOrderDateTime = (raw?: string | null, today: Date = new Date()): string => {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return /am|pm/i.test(raw) ? `${formatDate(today)} ${raw}` : raw;
  }
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${formatDate(d)} ${pad(h12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${h < 12 ? "AM" : "PM"}`;
};
