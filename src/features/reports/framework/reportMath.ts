import { dec, sumDec, toNum } from "../../../shared/lib/money";
import type { ReportColumn, ReportRow, ReportTable } from "./types";

/**
 * Pure report maths (unit-tested). Totals are exact decimal (shared/lib/money) — the old report pages
 * summed floats (0.1 + 0.2 = 0.30000000000000004) in three separate places (screen, PDF, Excel).
 */

const NUMERIC = new Set(["money", "number", "qty"]);
// "date" and "text" columns are left-aligned and never totalled.

export const isNumericColumn = (c: ReportColumn) => NUMERIC.has(c.kind);
export const isTotalled = (c: ReportColumn) => c.total ?? isNumericColumn(c);

/** Number in a cell (strings like "1,234.500" accepted); non-numbers → 0. */
export const cellNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

/** Exact column totals for every totalled column. */
export const computeTotals = (table: ReportTable): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const col of table.columns) {
    if (!isTotalled(col)) continue;
    const override = table.totalsOverride?.[col.key];
    totals[col.key] = override !== undefined && Number.isFinite(override)
      ? override
      : toNum(sumDec(table.rows.map((r) => cellNumber(r[col.key]))));
  }
  return totals;
};

/**
 * Columns from a backend `{ columns: string[]; rows }` payload: the listed text columns stay text,
 * every other column is money.
 */
export const dynamicColumns = (names: string[], textKeys: string[] = [], kindFor?: (name: string) => ReportColumn["kind"]): ReportColumn[] =>
  (names || []).map((name) => {
    const kind = kindFor?.(name) ?? (textKeys.includes(name) ? "text" : "money");
    return { key: name, label: name, kind, align: kind === "text" ? "left" : "right" };
  });

/** Adds a per-row "Total" column = exact Σ of the given columns (skipped when the backend already sends it). */
export const withRowTotal = (table: ReportTable, label = "Total", sumKeys?: string[]): ReportTable => {
  if (table.columns.some((c) => c.key === label)) return table;
  const keys = sumKeys ?? table.columns.filter(isNumericColumn).map((c) => c.key);
  return {
    columns: [...table.columns, { key: label, label, kind: "money", align: "right" }],
    rows: table.rows.map((r) => ({ ...r, [label]: toNum(sumDec(keys.map((k) => cellNumber(r[k])))) })),
  };
};

export interface Formatter {
  money: (n: number) => string;
  number: (n: number) => string;
}

/** A cell with nothing to show (Price on a grouped row). An empty value from the API still reads as 0. */
export const BLANK_CELL = Symbol("blank");

/** Display text for one cell. */
export const formatCell = (col: ReportColumn, value: unknown, fmt: Formatter): string => {
  if (value === BLANK_CELL) return "";
  if (col.kind === "money") return fmt.money(cellNumber(value));
  if (col.kind === "number" || col.kind === "qty") return fmt.number(cellNumber(value));
  if (col.kind === "date") return formatReportDate(value);
  if (col.kind === "datetime") return formatReportDateTime(value);
  const s = value === null || value === undefined ? "" : String(value);
  return s.trim() === "" ? "-" : s;
};

/** dd/MM/yyyy (same as the old report pages). "2026-11-05" / "2026-11-05T…" read by parts — no time-zone shift. */
export const formatReportDate = (value: unknown): string => {
  const s = value === null || value === undefined ? "" : String(value).trim();
  if (!s) return "-";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/**
 * dd/MM/yyyy HH:mm (the old purchase pages). A wall-clock value ("2026-11-05T14:30:00") is read by parts;
 * one with a zone (Z / +03:00) is shown in local time, as `new Date()` did.
 */
export const formatReportDateTime = (value: unknown): string => {
  const s = value === null || value === undefined ? "" : String(value).trim();
  if (!s) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  if (m && !zoned) return `${m[3]}/${m[2]}/${m[1]} ${m[4] ?? "00"}:${m[5] ?? "00"}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** A subtotal inside the list (All Transaction): bold on screen, no serial number. */
export const isSubtotalRow = (row: ReportRow) => row.__subtotal === true;

/** S.No of each row; subtotal rows are not counted. */
export const rowSerials = (rows: ReportRow[]): string[] => {
  let n = 0;
  return rows.map((r) => (isSubtotalRow(r) ? "" : String(++n)));
};

/**
 * The table as text, exactly as screen / print / Excel / PDF show it: header, rows (with S.No) and
 * the totals row. One source for every output.
 */
export const toMatrix = (table: ReportTable, fmt: Formatter, totalLabel = "Total") => {
  const totals = computeTotals(table);
  const header = ["S.No", ...table.columns.map((c) => c.label.toUpperCase())];
  const serials = rowSerials(table.rows);
  const body = table.rows.map((r, i) => [serials[i], ...table.columns.map((c) => formatCell(c, r[c.key], fmt))]);
  const firstText = table.columns.findIndex((c) => !isNumericColumn(c));
  const footer = ["", ...table.columns.map((c, i) =>
    isTotalled(c)
      ? (c.kind === "money" ? fmt.money : fmt.number)(totals[c.key] ?? 0)
      : i === firstText ? totalLabel.toUpperCase() : "",
  )];
  const align = ["center", ...table.columns.map((c) => c.align ?? (isNumericColumn(c) ? "right" : "left"))] as ("left" | "right" | "center")[];
  return { header, body, footer: table.rows.length && table.columns.some(isTotalled) ? footer : null, align, totals };
};

/** Sum check used by tests: totals equal the exact sum of the displayed rows. */
export const exactSum = (values: number[]): number => toNum(sumDec(values.map((v) => dec(v))));

export type { ReportRow };
