import { getDailySalesReport } from "../dailySalesReport/services/dailySalesReportApi";
import { getHourlySalesReport } from "../hourlySalesReport/services/hourlySalesReportApi";
import { getOrderTypeSalesReport } from "../orderTypeSalesReport/services/orderTypeSalesReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import { dynamicColumns, withRowTotal } from "../framework/reportMath";
import type { FilterValues, ReportDefinition, ReportTable } from "../framework/types";

/**
 * Sales-by-period reports whose backend returns `{ columns: string[]; rows }` (one text column + one
 * money column per paymode / order type). Phase 4 — replaces dailySalesReport, hourlySalesReport and
 * orderTypeSalesReport pages. Kept from the old pages: endpoints, params, text column, per-row Total.
 * Fixed: BranchId is never 0 (Order-Type defaulted to "0"), totals are exact, Order-Type no longer
 * includes an existing "Total" column in its own row total.
 */
type Payload = { columns?: string[]; rows?: Record<string, unknown>[] } | null | undefined;

export interface PeriodTableOptions {
  textKeys: string[];
  /** Text keys shown as dates (dd/MM/yyyy). */
  dateKeys?: string[];
  /** Display labels, e.g. { VoucherDate: "Date" }. */
  labels?: Record<string, string>;
  /** "compute": add Total = Σ money columns; "columnOnly": rows already carry Total (Hourly). */
  rowTotal: "compute" | "columnOnly";
  /** Copy a field into another key on every row (Order-Type: VoucherDate → Date). */
  copyField?: { from: string; to: string };
}

export const periodTable = (data: Payload, o: PeriodTableOptions): ReportTable => {
  const names = data?.columns ?? [];
  if (!names.length) return { columns: [], rows: [] };
  let rows = data?.rows ?? [];
  if (o.copyField) {
    const { from, to } = o.copyField;
    rows = rows.map((r) => (r[from] !== undefined && r[from] !== null && r[from] !== "" ? { ...r, [to]: r[from] } : r));
  }
  const columns = dynamicColumns(names, o.textKeys, (n) => (o.dateKeys?.includes(n) ? "date" : o.textKeys.includes(n) ? "text" : "money"))
    .map((c) => ({ ...c, label: o.labels?.[c.key] ?? c.label, align: c.kind === "money" ? ("right" as const) : ("left" as const) }));
  const table: ReportTable = { columns, rows };
  if (names.includes("Total")) return table;
  if (o.rowTotal === "columnOnly") {
    return { columns: [...table.columns, { key: "Total", label: "Total", kind: "money", align: "right" }], rows };
  }
  return withRowTotal(table, "Total", names.filter((n) => !o.textKeys.includes(n) && n !== "Total"));
};

export const dateRangeParams = (f: FilterValues) => ({
  BranchId: toReportBranchId(f.branch),
  FromDate: f.from,
  ToDate: f.to,
  Decimals: getDecimalPart(),
});

const dateFilters = (fromDefault: "today" | "firstOfMonth") => [
  { kind: "branch" as const, key: "branch" },
  { kind: "date" as const, key: "from", label: "From", default: fromDefault },
  { kind: "date" as const, key: "to", label: "To", default: "today" as const },
];

export const dailySalesReport: ReportDefinition = {
  id: "dailySalesReport",
  title: "Daily Sales Report",
  filters: dateFilters("firstOfMonth"),
  fetch: async (f) => periodTable(await getDailySalesReport(dateRangeParams(f)), { textKeys: ["VoucherDate"], dateKeys: ["VoucherDate"], labels: { VoucherDate: "Date" }, rowTotal: "compute" }),
  subtitle: (f) => `Daily Sales Report from ${f.from} To ${f.to}`,
};

export const hourlySalesReport: ReportDefinition = {
  id: "hourlySalesReport",
  title: "Hourly Sales Report",
  filters: dateFilters("firstOfMonth"),
  fetch: async (f) => periodTable(await getHourlySalesReport(dateRangeParams(f)), { textKeys: ["Time"], rowTotal: "columnOnly" }),
  subtitle: (f) => `Hourly Sales Report from ${f.from} To ${f.to}`,
};

export const orderTypeSalesReport: ReportDefinition = {
  id: "orderTypeSalesReport",
  title: "Order Type Sales Report",
  filters: dateFilters("today"),
  fetch: async (f) => {
    const res = (await getOrderTypeSalesReport(dateRangeParams(f))) as { data?: Payload } | null;
    return periodTable(res?.data, { textKeys: ["Date", "VoucherDate"], dateKeys: ["Date", "VoucherDate"], labels: { VoucherDate: "Date" }, rowTotal: "compute", copyField: { from: "VoucherDate", to: "Date" } });
  },
  subtitle: (f) => `Order Type Sales Report from ${f.from} To ${f.to}`,
};
