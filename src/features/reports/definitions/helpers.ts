import type { FilterDef, FilterValues, ReportColumn, ReportRow } from "../framework/types";

/** Small helpers shared by the report definitions. */
export type AnyRow = Record<string, unknown>;
export type Option = { label: string; value: string };

export const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
export const lower = (v: unknown) => str(v).toLowerCase();
export const asArray = (v: unknown): AnyRow[] => (Array.isArray(v) ? (v as AnyRow[]) : []);
export const has = (row: ReportRow, keys: string[], term: string) => keys.some((k) => lower(row[k]).includes(term));
export const selected = (v: string | undefined) => !!v && v !== "0";

export const text = (key: string, label: string, align: ReportColumn["align"] = "left"): ReportColumn => ({ key, label, kind: "text", align });
export const center = (key: string, label: string) => text(key, label, "center");
export const money = (key: string, label: string, total = true): ReportColumn => ({ key, label, kind: "money", align: "right", total });
export const qty = (key = "qty", label = "Qty"): ReportColumn => ({ key, label, kind: "qty", align: "right" });
export const date = (key: string, label: string): ReportColumn => ({ key, label, kind: "date", align: "center" });

/** From / To filters. The VAT and levy reports open on today, the others on the first of the month. */
export const dateFilters: FilterDef[] = [
  { kind: "date", key: "from", label: "From", default: "firstOfMonth" },
  { kind: "date", key: "to", label: "To", default: "today" },
];
export const todayFilters: FilterDef[] = [
  { kind: "date", key: "from", label: "From", default: "today" },
  { kind: "date", key: "to", label: "To", default: "today" },
];
export const dateRangeSubtitle = (title: string) => (f: FilterValues) => `${title} from ${f.from} To ${f.to}`;

const productOption = (p: AnyRow): Option => ({ value: str(p.productId), label: p.code ? `[${str(p.code)}] ${str(p.productName)}` : str(p.productName) });
export const productOptions = (load: () => Promise<unknown>) => async (): Promise<Option[]> => asArray(await load()).map(productOption);

/** Backend totals (object or [object]) for the given keys; a key the backend did not send falls back to the sum. */
export const backendTotals = (totalData: unknown, keys: string[]): Record<string, number> | undefined => {
  const t = (Array.isArray(totalData) ? totalData[0] : totalData) as AnyRow | null | undefined;
  if (!t || typeof t !== "object") return undefined;
  const out: Record<string, number> = {};
  keys.forEach((k) => { if (t[k] !== undefined && t[k] !== null && t[k] !== "") out[k] = Number(t[k]); });
  return out;
};
