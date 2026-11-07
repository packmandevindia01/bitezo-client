import { getSalesReport, getPaymodeList, getCustomerList, getSeriesList } from "../salesReport/services/salesReportApi";
import { getBillWiseMarginReport, getSeriesList as getMarginSeries, getCustomerList as getMarginCustomers } from "../billWiseMarginReport/services/billWiseMarginReportApi";
import { getProductWiseMarginReport, getProductList as getMarginProducts, getGroupList, getCategoryList, getSubCategoryList } from "../productWiseMarginReport/services/productWiseMarginReportApi";
import { allTransactionReportApi } from "../allTransactionReport/services/allTransactionReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import { sumDec, toNum } from "../../../shared/lib/money";
import { cellNumber } from "../framework/reportMath";
import type { FilterValues, ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";
import { asArray, backendTotals, center, date, dateFilters, dateRangeSubtitle, lower, money, selected, str, text, type AnyRow, type Option } from "./helpers";
import { cashCredit, seriesKey } from "./purchase";

/** Sales, Bill / Product Wise Margin and All Transaction reports (Phase 4). */
const customerOption = (c: AnyRow): Option => ({ value: str(c.customerId), label: c.code ? `[${str(c.code)}] ${str(c.customerName)}` : str(c.customerName) });

export const formatTransactionDateTime = (row: AnyRow): string => {
  const rawDate = str(row.invoiceDate || row.transDate || row.createdAt || row.voucherDate);
  if (!rawDate) return "";
  const rawTime = str(row.invoiceTime || row.transTime || row.time || row.orderTime || row.entryTime);

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim());
  let d: Date;
  if (isDateOnly) {
    const [y, m, day] = rawDate.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(rawDate);
  }

  if (isNaN(d.getTime())) return rawTime ? `${rawDate} ${rawTime}` : rawDate;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const dateFormatted = `${dd}/${mm}/${yyyy}`;

  if (rawTime) return `${dateFormatted} ${rawTime}`;

  const isZeroTime = /^.*T00:00:00(\.0+)?(Z|[+-]\d{2}:\d{2})?$/.test(rawDate.trim());
  const hasTimeComponent = !isDateOnly && !isZeroTime && (
    rawDate.includes("T") || rawDate.includes(":")
  );

  if (hasTimeComponent) {
    const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateFormatted} ${timeStr}`;
  }

  return dateFormatted;
};

// ── Sales ─────────────────────────────────────────────────────────────────────────────
const SALES_SUM_KEYS = ["netValue", "vatAmount", "billsundry", "roundOff", "netAmount"];
export const SALES_COLUMNS: ReportColumn[] = [
  center("billDate", "Bill Date & Time"), center("invoiceNo", "BillNo"), center("refNo", "Ref No"), text("customerName", "Customer"), center("customerCode", "Code"),
  center("employee", "Employee"), center("paymode", "Paymode"),
  money("netValue", "Net Value"), money("vatAmount", "Vat Amnt"), money("billsundry", "Billsundry"), money("roundOff", "RoundOff"), money("netAmount", "Amount"),
];
export type SalesGroupBy = "All" | "Customer" | "Paymode" | "Series";
export interface SalesMasters { customers: AnyRow[]; paymodes: AnyRow[]; series: AnyRow[] }

/** Client fallbacks of the old page. The branch check is only for a real branch ("All" kept every row out). */
export const applySalesFallbacks = (rows: AnyRow[], f: FilterValues, m: SalesMasters): AnyRow[] =>
  rows.filter((row) => {
    if (selected(f.customer)) {
      const c = m.customers.find((x) => str(x.customerId) === f.customer);
      if (c && lower(row.customerName) !== lower(c.customerName) && lower(row.customerCode) !== lower(c.code)) return false;
    }
    if (selected(f.paymode)) {
      const name = m.paymodes.find((p) => str(p.paymodeId) === f.paymode)?.paymodeName;
      if (name && row.paymode && lower(row.paymode) !== lower(name)) return false;
    }
    if (selected(f.branch) && f.branch !== "1" && row.branchId !== undefined && str(row.branchId) !== f.branch) return false;
    if (selected(f.series)) {
      const name = m.series.find((s) => str(s.seriesId) === f.series)?.seriesName;
      if (name) {
        if (row.seriesId !== undefined && str(row.seriesId) !== f.series) return false;
        if (row.seriesName && lower(row.seriesName) !== lower(name)) return false;
      }
    }
    return true;
  });

export const salesRows = (rows: AnyRow[], groupBy: SalesGroupBy): ReportRow[] => {
  const blank = { billDate: "", invoiceNo: "", refNo: "", customerName: "", customerCode: "", employee: "", paymode: "" };
  const money0 = (r: AnyRow) => Object.fromEntries(SALES_SUM_KEYS.map((k) => [k, cellNumber(r[k])]));
  if (groupBy === "All") {
    return rows.map((r) => ({
      billDate: formatTransactionDateTime(r), invoiceNo: str(r.invoiceNo), refNo: str(r.refNo), customerName: str(r.customerName), customerCode: str(r.customerCode),
      employee: str(r.employee), paymode: str(r.paymode), ...money0(r),
    }));
  }
  const groups = new Map<string, AnyRow[]>();
  rows.forEach((r) => {
    const key = groupBy === "Customer" ? str(r.customerName) || "Unknown" : groupBy === "Paymode" ? str(r.paymode) || "Unknown" : seriesKey(r.invoiceNo);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return Array.from(groups, ([key, members]) => ({
    ...blank,
    ...(groupBy === "Customer" ? { customerName: str(members[0].customerName) || "Unknown Customer", customerCode: str(members[0].customerCode) } : {}),
    ...(groupBy === "Paymode" ? { paymode: key } : {}),
    ...(groupBy === "Series" ? { invoiceNo: key } : {}),
    ...Object.fromEntries(SALES_SUM_KEYS.map((k) => [k, toNum(sumDec(members.map((r) => cellNumber(r[k]))))])),
  }));
};

export const salesTable = (rows: AnyRow[], f: FilterValues, m: SalesMasters): ReportTable => {
  const filtered = applySalesFallbacks(rows, f, m);
  const { cash, credit } = cashCredit(filtered);
  return {
    columns: SALES_COLUMNS,
    rows: salesRows(filtered, (f.groupBy as SalesGroupBy) || "All"),
    summary: [{ label: "Cash", value: cash }, { label: "Credit", value: credit }],
  };
};

export const salesReport: ReportDefinition = {
  id: "salesReport",
  title: "Sales Report",
  columns: SALES_COLUMNS,
  filters: [
    { kind: "select", key: "groupBy", label: "Group by", options: ["All", "Customer", "Paymode", "Series"].map((v) => ({ label: v, value: v })), default: "All" },
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "series", label: "Series", queryKey: "salesSeries", dependsOn: ["branch"], load: async (f) => asArray(await getSeriesList(Number(f.branch))).map((s) => ({ value: str(s.seriesId), label: str(s.seriesName) })) },
    { kind: "lookup", key: "customer", label: "Customer", queryKey: "salesCustomers", load: async () => asArray(await getCustomerList()).map(customerOption) },
    { kind: "lookup", key: "paymode", label: "Paymode", queryKey: "paymodes", load: async () => asArray(await getPaymodeList()).map((p) => ({ value: str(p.paymodeId), label: str(p.paymodeName) })) },
    ...dateFilters,
  ],
  fetch: async (f) => {
    const [data, customers, paymodes, series] = await Promise.all([
      getSalesReport({
        BranchId: toReportBranchId(f.branch), SeriesId: Number(f.series) || 0, FromDate: f.from, ToDate: f.to,
        CustomerId: Number(f.customer) || 0, PaymodeId: Number(f.paymode) || 0, Decimals: getDecimalPart(),
      }),
      selected(f.customer) ? getCustomerList().catch(() => []) : [],
      selected(f.paymode) ? getPaymodeList().catch(() => []) : [],
      selected(f.series) ? getSeriesList(Number(f.branch)).catch(() => []) : [],
    ]);
    return salesTable(asArray((data as unknown as AnyRow | null)?.salesData), f, { customers: asArray(customers), paymodes: asArray(paymodes), series: asArray(series) });
  },
  subtitle: dateRangeSubtitle("Sales Report"),
};

// ── Margin ────────────────────────────────────────────────────────────────────────────
const MARGIN_KEYS = ["netValue", "cost", "margin"];
const marginColumns = (percentKey: string): ReportColumn[] => [money("netValue", "Net Value"), money("cost", "Cost"), money("margin", "Margin"), money(percentKey, "Margin %")];

/** Totals from the backend. Margin % cannot be summed, so it is 0 when the backend does not send it. */
export const marginTotals = (totalData: unknown, percentKey: string): Record<string, number> => {
  const t = (Array.isArray(totalData) ? totalData[0] : totalData) as AnyRow | null | undefined;
  return { ...backendTotals(t, MARGIN_KEYS), [percentKey]: cellNumber(t?.marginper) };
};

export const BILL_MARGIN_COLUMNS: ReportColumn[] = [date("invoiceDate", "Date"), center("invoiceNo", "Bill No"), center("customerCode", "Code"), text("customerName", "Customer"), ...marginColumns("marginper")];

export const billWiseMarginReport: ReportDefinition = {
  id: "billWiseMarginReport",
  title: "Bill Wise Margin Report",
  columns: BILL_MARGIN_COLUMNS,
  filters: [
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "series", label: "Series", queryKey: "marginSeries", dependsOn: ["branch"], load: async (f) => asArray(await getMarginSeries(f.branch)).filter((s) => s.seriesName && lower(s.seriesName) !== "all").map((s) => ({ value: str(s.seriesId), label: str(s.seriesName) })) },
    { kind: "lookup", key: "customer", label: "Customer", queryKey: "marginCustomers", load: async () => asArray(await getMarginCustomers()).filter((c) => c.customerName && lower(c.customerName) !== "all").map(customerOption) },
    ...dateFilters,
  ],
  fetch: async (f) => {
    const d = (await getBillWiseMarginReport({
      BranchId: toReportBranchId(f.branch), SeriesId: Number(f.series) || 0, CustomerId: Number(f.customer) || 0, FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
    })) as unknown as AnyRow | null;
    return { columns: BILL_MARGIN_COLUMNS, rows: asArray(d?.salesData) as ReportRow[], totalsOverride: marginTotals(d?.totalData, "marginper") };
  },
  subtitle: dateRangeSubtitle("Bill Wise Margin Report"),
};

export const PRODUCT_MARGIN_COLUMNS: ReportColumn[] = [
  center("productCode", "Product Code"), text("productName", "Product Name"), center("group", "Group"), center("category", "Category"), center("subCategory", "Sub Category"), ...marginColumns("marginPer"),
];

export const productWiseMarginReport: ReportDefinition = {
  id: "productWiseMarginReport",
  title: "Product Wise Margin Report",
  columns: PRODUCT_MARGIN_COLUMNS,
  filters: [
    { kind: "branch", key: "branch" },
    {
      kind: "lookup", key: "product", label: "Product", queryKey: "marginProducts", dependsOn: ["branch"],
      load: async (f) => asArray(await getMarginProducts(toReportBranchId(f.branch))).map((p) => {
        const name = str(p.name || p.productName);
        const code = str(p.code || p.productCode);
        return { value: str(p.productId ?? p.id), label: code ? `[${code}] ${name}` : name, name };
      }).filter((o) => o.name && o.name.toLowerCase() !== "all").map(({ value, label }) => ({ value, label })),
    },
    { kind: "lookup", key: "group", label: "Group", queryKey: "marginGroups", load: async () => asArray(await getGroupList()).map((g) => ({ value: str(g.grpId), label: str(g.name) })) },
    { kind: "lookup", key: "category", label: "Category", queryKey: "marginCategories", load: async () => asArray(await getCategoryList()).map((c) => ({ value: str(c.catId), label: str(c.catName) })) },
    { kind: "lookup", key: "subCategory", label: "Sub Category", queryKey: "marginSubCategories", load: async () => asArray(await getSubCategoryList()).map((s) => ({ value: str(s.subCatId), label: str(s.name) })) },
    ...dateFilters,
  ],
  fetch: async (f) => {
    const d = (await getProductWiseMarginReport({
      BranchId: toReportBranchId(f.branch), ProductId: Number(f.product) || 0, GroupId: Number(f.group) || 0, CategoryId: Number(f.category) || 0,
      SubcategoryId: Number(f.subCategory) || 0, FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
    })) as unknown as AnyRow | AnyRow[] | null;
    const rows = Array.isArray(d) ? d : asArray(d?.productsData);
    return { columns: PRODUCT_MARGIN_COLUMNS, rows: rows as ReportRow[], totalsOverride: marginTotals(Array.isArray(d) ? null : d?.totalData, "marginPer") };
  },
  subtitle: dateRangeSubtitle("Product Wise Margin Report"),
};

// ── All Transaction ───────────────────────────────────────────────────────────────────
// No grand total: it would add sales, purchases and balances together. Each voucher has its own subtotal.
export const ALL_TRANSACTION_COLUMNS: ReportColumn[] = [text("particular", "Particular"), money("amount", "Amount", false)];

/** Vouchers in the order they arrive, each with a "Total <voucher>" row; every balance row goes last. */
export const allTransactionTable = (rows: AnyRow[]): ReportTable => {
  const groups = new Map<string, AnyRow[]>();
  const isBalance = (v: string) => v.toLowerCase().includes("balance");
  rows.filter((r) => !isBalance(str(r.voucher) || "Unknown")).forEach((r) => {
    const v = str(r.voucher) || "Unknown";
    groups.set(v, [...(groups.get(v) ?? []), r]);
  });
  const balances = rows.filter((r) => isBalance(str(r.voucher) || "Unknown"));
  if (balances.length) groups.set("Balance", balances);
  const sum = (list: AnyRow[]) => toNum(sumDec(list.map((r) => cellNumber(r.amount))));
  return {
    columns: ALL_TRANSACTION_COLUMNS,
    rows: Array.from(groups, ([voucher, items]) => [
      ...items.map((r): ReportRow => ({ particular: r.particular, amount: cellNumber(r.amount) })),
      { particular: `Total ${voucher}`, amount: sum(items), __subtotal: true },
    ]).flat(),
  };
};

export const allTransactionReport: ReportDefinition = {
  id: "allTransactionReport",
  title: "All Transaction Report",
  columns: ALL_TRANSACTION_COLUMNS,
  filters: [{ kind: "branch", key: "branch" }, ...dateFilters],
  fetch: async (f) => allTransactionTable(asArray(await allTransactionReportApi.getAllTransactionReport({
    BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
  }))),
  subtitle: dateRangeSubtitle("All Transaction Report"),
};
