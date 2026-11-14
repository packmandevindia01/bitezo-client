/**
 * Back Office transaction prints (Purchase, Purchase Return, Stock Adjustment, Stock Transfer, vouchers), 2026-11-14:
 * the Date line shows the document date + the time it was saved, 12-hour AM/PM ("07/11/2026 03:25 PM"),
 * and a "Printed on" line shows when Print was pressed. The date box has no time, so the time comes from:
 *  - a saved document opened for edit: the backend's created time (`pickSavedAt`), when it sends one;
 *  - right after Save: the moment the save succeeded.
 * No usable time → the date alone.
 */
const pad = (n: number) => String(n).padStart(2, "0");

/** "03:25 PM" */
export const formatTime12 = (d: Date): string => {
  const h = d.getHours();
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
};

const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

/** A real date-time (not empty, not the .NET "0001" / SQL "1900" placeholders, not a bare date at 00:00:00). */
const readDateTime = (raw: unknown): Date | null => {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s.startsWith("0001") || s.startsWith("1900")) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) || /T00:00:00(\.0+)?$/.test(s)) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/** The saved time of a loaded document, from whichever created-time field the backend sends; "" when none. */
export const pickSavedAt = (master: Record<string, unknown> | null | undefined): string => {
  if (!master) return "";
  for (const key of ["createdAt", "CreatedAt", "createdDate", "CreatedDate", "createdOn", "CreatedOn", "entryTime", "EntryTime"]) {
    const d = readDateTime(master[key]);
    if (d) return d.toISOString();
  }
  return "";
};

/** Document date ("yyyy-mm-dd", "dd/mm/yyyy" or ISO) shown as dd/MM/yyyy, plus the saved time when known. */
export const formatDocDateTime = (date: string | null | undefined, savedAt?: string | null): string => {
  const raw = String(date ?? "").trim();
  let dateText = raw;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) dateText = `${iso[3]}/${iso[2]}/${iso[1]}`;
  const saved = readDateTime(savedAt);
  if (!saved) return dateText;
  return dateText ? `${dateText} ${formatTime12(saved)}` : `${formatDate(saved)} ${formatTime12(saved)}`;
};

/** "14/11/2026 12:11 PM" for the "Printed on" line. */
export const formatPrintedOn = (now: Date = new Date()): string => `${formatDate(now)} ${formatTime12(now)}`;
