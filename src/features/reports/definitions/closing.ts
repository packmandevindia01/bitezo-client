import { getDayEndReport, getDayEndCashierLogDetail } from "../dayEndReport/services/dayEndReportApi";
import { getShiftEndReport, getShiftEndCashierLogDetail, getUserList, getCounterList } from "../shiftEndReport/services/shiftEndReportApi";
import { getProductTransactionLogReport, getProductList as getLogProducts } from "../productTransactionLogReport/services/productTransactionLogReportApi";
import { hasQty } from "../productTransactionLogReport/utils/normalizeTransactionLog";
import { getDecimalPart } from "../../../shared/lib/currency";
import { ALL_BRANCH_ID, toReportBranchId } from "../../../hooks/useBranchScope";
import { cellNumber, formatReportDateTime } from "../framework/reportMath";
import type { ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";
import { asArray, center, date, dateFilters, dateRangeSubtitle, has, lower, money, str, text, type AnyRow, type Option } from "./helpers";

/** Day End, Shift End and Product Transaction Log (Phase 4). */
const norm = (s: string) => s.toLowerCase().replace(/[\s_]/g, "");
/** Start / end of a day or shift; 1900 is how the backend sends "not closed yet". */
const closingTime = (v: unknown) => (!v || str(v).startsWith("1900") ? "-" : formatReportDateTime(v));

/** Same cell lookup as the old pages: the three cash columns come under several spellings. */
export const closingCell = (row: AnyRow, col: string): number => {
  const n = norm(col);
  if (n === "openingbalance" || n === "openingbal") return cellNumber(row["Opening Balance"] ?? row.OpeningBal ?? row.openingBal ?? row.Opening_Balance);
  if (n === "payin") return cellNumber(row["Pay In"] ?? row.PayIn ?? row.payIn ?? row.Pay_In);
  if (n === "payout") return cellNumber(row["Pay Out"] ?? row.PayOut ?? row.payOut ?? row.Pay_Out);
  return cellNumber(row[col]);
};

/** API columns minus the fixed ones; Opening / Pay In / Pay Out added when missing, Total always last. */
export const closingColumnNames = (raw: string[], excluded: string[]): string[] => {
  const cols = raw.filter((c) => !excluded.includes(c));
  const has2 = (...names: string[]) => cols.some((c) => names.includes(norm(c)));
  const result = cols.filter((c) => c.toLowerCase() !== "total");
  if (!has2("openingbalance", "openingbal")) result.push("Opening Balance");
  if (!has2("payin")) result.push("Pay In");
  if (!has2("payout")) result.push("Pay Out");
  if (cols.some((c) => c.toLowerCase() === "total")) result.push("Total");
  return result;
};

/** Rows without the cash columns get them from the cashier log (one request per row, as before). */
export const withCashFlow = (rows: AnyRow[], detail: (row: AnyRow) => Promise<AnyRow | null> | null): Promise<AnyRow[]> =>
  Promise.all(rows.map(async (row) => {
    if (row["Pay In"] !== undefined || row.PayIn !== undefined || row.payIn !== undefined) {
      return { ...row, "Opening Balance": cellNumber(row["Opening Balance"] ?? row.OpeningBal ?? row.openingBal), "Pay In": cellNumber(row["Pay In"] ?? row.PayIn ?? row.payIn), "Pay Out": cellNumber(row["Pay Out"] ?? row.PayOut ?? row.payOut) };
    }
    const d = await detail(row);
    const cf = ((d?.cashFlow ?? (d?.data as AnyRow | undefined)?.cashFlow ?? d ?? {}) as AnyRow);
    return { ...row, "Opening Balance": cellNumber(cf.openingBal ?? d?.openingBal), "Pay In": cellNumber(cf.payIn ?? d?.payIn), "Pay Out": cellNumber(cf.payOut ?? d?.payOut) };
  }));

export const closingTable = (rows: AnyRow[], rawColumns: string[], excluded: string[], fixed: ReportColumn[]): ReportTable => {
  const names = closingColumnNames(rawColumns, excluded);
  return {
    columns: [...fixed, ...names.map((n) => money(n, n))],
    rows: rows.map((r): ReportRow => ({
      StartDate: closingTime(r.StartDate), EndDate: closingTime(r.EndDate), User: r.User ?? "-", Counter: r.Counter ?? "-",
      ...Object.fromEntries(names.map((n) => [n, closingCell(r, n)])),
    })),
  };
};

const DAY_FIXED = [center("StartDate", "Start Date"), center("EndDate", "End Date")];
const SHIFT_FIXED = [...DAY_FIXED, center("User", "User"), center("Counter", "Counter")];

export const dayEndReport: ReportDefinition = {
  id: "dayEndReport",
  title: "Day End Report",
  columns: DAY_FIXED,
  filters: [{ kind: "branch", key: "branch" }, ...dateFilters],
  fetch: async (f) => {
    const res = (await getDayEndReport({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart() })) as unknown as AnyRow | null;
    const rows = await withCashFlow(asArray(res?.rows), (r) => (r.DayId ? getDayEndCashierLogDetail(r.DayId as number) as Promise<AnyRow | null> : null));
    return closingTable(rows, (res?.columns as string[]) || [], ["DayId", "SNo", "StartDate", "EndDate"], DAY_FIXED);
  },
  subtitle: dateRangeSubtitle("Day End Report"),
};

export const shiftEndReport: ReportDefinition = {
  id: "shiftEndReport",
  title: "Shift End Report",
  columns: SHIFT_FIXED,
  filters: [
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "user", label: "User", allLabel: "All Users", queryKey: "shiftEndUsers", load: async () => asArray(await getUserList()).map((u) => ({ value: str(u.userId), label: str(u.userName) })) },
    {
      kind: "lookup", key: "counter", label: "Counter", allLabel: "All Counters", queryKey: "shiftEndCounters", dependsOn: ["branch"],
      // Counters belong to a real branch, not "All".
      load: async (f) => (toReportBranchId(f.branch) === ALL_BRANCH_ID ? [] : asArray(await getCounterList(Number(f.branch))).map((c) => ({ value: str(c.counterId), label: str(c.counterName) }))),
    },
    ...dateFilters,
  ],
  fetch: async (f) => {
    const res = (await getShiftEndReport({
      BranchId: toReportBranchId(f.branch), UserId: Number(f.user) || 0, CounterId: Number(f.counter) || 0, FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
    })) as unknown as AnyRow | null;
    const rows = await withCashFlow(asArray(res?.rows), (r) => (r.DayId && r.ShiftId ? getShiftEndCashierLogDetail(r.DayId as number, r.ShiftId as number) as Promise<AnyRow | null> : null));
    return closingTable(rows, (res?.columns as string[]) || [], ["DayId", "ShiftId", "SNo", "StartDate", "EndDate", "User", "Counter"], SHIFT_FIXED);
  },
  subtitle: dateRangeSubtitle("Shift End Report"),
};

// ── Product Transaction Log ───────────────────────────────────────────────────────────
const logQty = (key: string, label: string): ReportColumn => text(key, label, "right");
export const LOG_COLUMNS: ReportColumn[] = [
  center("branch", "Branch"), date("date", "Date"), text("transaction", "Transaction"), center("voucherNo", "Voucher No"), text("account", "Account"),
  logQty("qtyIn", "Qty In"), logQty("qtyOut", "Qty Out"), logQty("balance", "Balance"),
];
const TRANSACTION_TYPES = ["All", "Purchase", "Purchase Return", "Sales", "Sales Return", "Stock Adjustment", "Stock Transfer", "Production", "Raw Material"];

export const logTable = (data: unknown, transactionType: string): ReportTable => {
  const d = data as AnyRow | null | undefined;
  const rows = asArray(d?.logData);
  const t = (d?.totalData ?? {}) as AnyRow;
  const opening = str(t.opening ?? "-");
  const balance = str(t.balance ?? "-");
  return {
    columns: LOG_COLUMNS,
    rows: (transactionType && transactionType !== "All" ? rows.filter((r) => lower(r.transaction) === lower(transactionType)) : rows) as ReportRow[],
    summary: [
      { label: "Opening", value: opening }, { label: "Received", value: str(t.received ?? "-") }, { label: "Issued", value: str(t.issued ?? "-") }, { label: "Closing Balance", value: balance },
    ],
    emptyMessage: Object.values(t).some((v) => hasQty(v as string))
      ? `No transactions in this period. Opening: ${opening} · Closing Balance: ${balance}`
      : "No transaction records found matching filters.",
  };
};

/** A product opened from the Stock Register may not be in the list; its name comes with the link. */
const logProductOptions = async (): Promise<Option[]> => {
  const options = asArray(await getLogProducts()).map((p) => ({ value: str(p.productId), label: p.code ? `[${str(p.code)}] ${str(p.productName)}` : str(p.productName) }));
  const url = new URLSearchParams(window.location.search);
  const id = url.get("product");
  const name = url.get("productName");
  return id && name && !options.some((o) => o.value === id) ? [{ value: id, label: name }, ...options] : options;
};

export const productTransactionLogReport: ReportDefinition = {
  id: "productTransactionLogReport",
  title: "Product Transaction Log",
  columns: LOG_COLUMNS,
  filters: [
    { kind: "branch", key: "branch", label: "Branch" },
    { kind: "select", key: "transactionType", label: "Transaction", options: TRANSACTION_TYPES.map((v) => ({ label: v, value: v })), default: "All" },
    { kind: "lookup", key: "product", label: "Product", allLabel: "Select Product", queryKey: "logProducts", load: logProductOptions },
    ...dateFilters,
  ],
  requires: { key: "product", message: "Select a product to view its transactions." },
  urlParams: { product: "product" },
  search: { placeholder: "Search transaction, voucher, account…", match: (r, t) => has(r, ["transaction", "voucherNo", "account", "branch"], t) },
  fetch: async (f) => logTable(await getProductTransactionLogReport({ BranchId: toReportBranchId(f.branch), ProductId: Number(f.product), FromDate: f.from, ToDate: f.to }), f.transactionType),
  subtitle: dateRangeSubtitle("Product Transaction Log"),
};
