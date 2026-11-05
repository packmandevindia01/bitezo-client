import { getMonthlySalesReport } from "../monthlySalesReport/services/monthlySalesReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import { dynamicColumns, withRowTotal } from "../framework/reportMath";
import { parseMonth } from "../framework/filterDefaults";
import type { FilterValues, ReportDefinition, ReportTable } from "../framework/types";

/**
 * Monthly Sales Report on the report framework (Phase 4 pilot).
 * Backend: GET /reports/monthly-sales-report → { columns: string[]; rows } — "Month" is text, every other
 * column is a money amount per order type / paymode. A per-row "Total" column is added unless the backend
 * already sends one (same as the old page). BranchId is never 0 (toReportBranchId: empty → 1 = All).
 */
export const monthlySalesParams = (f: FilterValues, now = new Date()) => {
  const from = parseMonth(f.from, { year: now.getFullYear(), month: 1 });
  const to = parseMonth(f.to, { year: now.getFullYear(), month: 12 });
  return {
    BranchId: toReportBranchId(f.branch),
    FromMonth: from.month,
    FromYear: from.year,
    ToMonth: to.month,
    ToYear: to.year,
    Decimals: getDecimalPart(),
  };
};

/** Backend payload → framework table (pure, unit-tested against the old page logic). */
export const monthlySalesTable = (data: { columns?: string[]; rows?: Record<string, unknown>[] } | null | undefined): ReportTable => {
  const names = data?.columns ?? [];
  const table: ReportTable = { columns: dynamicColumns(names, ["Month"]), rows: data?.rows ?? [] };
  return names.length ? withRowTotal(table, "Total", names.filter((n) => n !== "Month")) : table;
};

export const monthlySalesReport: ReportDefinition = {
  id: "monthlySalesReport",
  title: "Monthly Sales Report",
  filters: [
    { kind: "branch", key: "branch" },
    { kind: "month", key: "from", label: "From", default: "januaryThisYear" },
    { kind: "month", key: "to", label: "To", default: "decemberThisYear" },
  ],
  fetch: async (f) => monthlySalesTable(await getMonthlySalesReport(monthlySalesParams(f))),
  subtitle: (f) => `Monthly Sales Report from ${f.from} To ${f.to}`,
};
