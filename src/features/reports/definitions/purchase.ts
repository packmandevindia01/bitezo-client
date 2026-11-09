import { getPurchaseReport, getPaymodeList, getSupplierList, getSeriesList } from "../purchaseReport/services/purchaseReportApi";
import { getPurchaseReturnReport, getSeriesList as getReturnSeriesList } from "../purchaseReturnReport/services/purchaseReturnReportApi";
import { getProductWisePurchaseReport, getProductList as getPwProductList } from "../productWisePurchaseReport/services/productWisePurchaseReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import { sumDec, toNum } from "../../../shared/lib/money";
import { BLANK_CELL, cellNumber } from "../framework/reportMath";
import type { FilterValues, ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";

/**
 * Purchase and Purchase Return reports on the report framework (Phase 4, batch 2). Same rules as the
 * old pages (they were twins):
 *  - client-side fallback filters for supplier (name or code), paymode (name) and series, in case the
 *    server ignores the id; the branch fallback is kept for a real branch only — for "All" (1) the old
 *    one wrongly dropped every row of the other branches;
 *  - "Group by" Supplier / Paymode / Series (series = alphabetic invoice-no prefix, else "Main") sums
 *    the money columns — now exact (the old page summed floats);
 *  - Cash = Σ netAmount where the paymode contains "cash"; Credit = Σ where it does not.
 */
type AnyRow = Record<string, unknown>;
type Option = { label: string; value: string };
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const lower = (v: unknown) => str(v).toLowerCase();

const MONEY_KEYS = ["netValue", "vatAmount", "billsundry", "roundOff", "netAmount"] as const;
const money = (key: string, label: string): ReportColumn => ({ key, label, kind: "money", align: "right" });
export const PURCHASE_COLUMNS: ReportColumn[] = [
  { key: "invoiceDate", label: "BillDate", kind: "datetime", align: "left" },
  { key: "invoiceNo", label: "BillNo", kind: "text", align: "center" },
  { key: "refNo", label: "Ref No", kind: "text", align: "center" },
  { key: "supplierName", label: "Supplier", kind: "text", align: "left" },
  { key: "supplierCode", label: "Code", kind: "text", align: "center" },
  { key: "employee", label: "Employee", kind: "text", align: "center" },
  { key: "paymode", label: "Paymode", kind: "text", align: "center" },
  money("netValue", "Net Value"),
  money("vatAmount", "Vat Amnt"),
  money("billsundry", "Billsundry"),
  money("roundOff", "RoundOff"),
  money("netAmount", "Amount"),
];

/** Exactly what the purchase report API sends: it has the purchase's own date and number and no billsundry. */
export const PURCHASE_REPORT_COLUMNS: ReportColumn[] = [
  { key: "purchaseDate", label: "Purchase Date", kind: "datetime", align: "left" },
  { key: "purchaseNo", label: "Purchase No", kind: "text", align: "center" },
  ...PURCHASE_COLUMNS.filter((c) => c.key !== "billsundry"),
];

/** Exactly what the purchase return report API sends: BillDate is its return date, and it has a return number and no billsundry. */
export const PURCHASE_RETURN_REPORT_COLUMNS: ReportColumn[] = [
  PURCHASE_COLUMNS[0],
  { key: "purchaseReturnNo", label: "Return No", kind: "text", align: "center" },
  ...PURCHASE_COLUMNS.slice(1).filter((c) => c.key !== "billsundry"),
];

export type PurchaseGroupBy = "All" | "Supplier" | "Paymode" | "Series";

export interface PurchaseMasters {
  suppliers: AnyRow[];
  paymodes: AnyRow[];
  series: AnyRow[];
}

/** The old hook's client-side filter fallback (branch only for a real branch, not "All"). */
export const applyPurchaseFallbacks = (rows: AnyRow[], f: FilterValues, m: PurchaseMasters): AnyRow[] =>
  rows.filter((row) => {
    if (f.supplier && f.supplier !== "0") {
      const sup = m.suppliers.find((s) => String(s.supplierId) === f.supplier);
      if (sup && lower(row.supplierName) !== lower(sup.supplierName) && lower(row.supplierCode) !== lower(sup.code)) return false;
    }
    if (f.paymode && f.paymode !== "0") {
      const name = m.paymodes.find((p) => String(p.paymodeId) === f.paymode)?.paymodeName;
      if (name && row.paymode && lower(row.paymode) !== lower(name)) return false;
    }
    if (f.branch && f.branch !== "0" && f.branch !== "1") {
      if (row.branchId !== undefined && row.branchId !== null && String(row.branchId) !== f.branch) return false;
    }
    if (f.series && f.series !== "0") {
      const name = m.series.find((s) => String(s.seriesId) === f.series)?.seriesName;
      if (name) {
        if (row.seriesId !== undefined && String(row.seriesId) !== f.series) return false;
        if (row.seriesName && lower(row.seriesName) !== lower(name)) return false;
      }
    }
    return true;
  });

/** Series of a bill = its alphabetic invoice-number prefix ("PUR-12" → "PUR-"), else "Main". */
export const seriesKey = (invoiceNo: unknown): string => {
  const m = str(invoiceNo).match(/^([a-zA-Z\s_-]+)/);
  return m ? m[1].trim() : "Main";
};

const blank = (): ReportRow => ({ purchaseDate: "", purchaseNo: "", purchaseReturnNo: "", invoiceDate: "", invoiceNo: "", refNo: "", supplierName: "", supplierCode: "", employee: "", paymode: "" });

/** Rows as the old page showed them (supplier upper-case), optionally grouped with exact sums. */
export const purchaseRows = (rows: AnyRow[], groupBy: PurchaseGroupBy): ReportRow[] => {
  const asRow = (r: AnyRow): ReportRow => ({
    purchaseDate: str(r.purchaseDate),
    purchaseNo: str(r.purchaseNo),
    purchaseReturnNo: str(r.purchaseReturnNo),
    // The purchase return report sends its date as purchaseReturnDate.
    invoiceDate: r.invoiceDate || r.purchaseReturnDate || "",
    invoiceNo: str(r.invoiceNo),
    refNo: str(r.refNo),
    supplierName: str(r.supplierName).toUpperCase(),
    supplierCode: str(r.supplierCode),
    employee: str(r.employee),
    paymode: str(r.paymode).toUpperCase(),
    ...Object.fromEntries(MONEY_KEYS.map((k) => [k, cellNumber(r[k])])),
  });
  if (groupBy === "All") return rows.map(asRow);

  const groups = new Map<string, { head: ReportRow; members: AnyRow[] }>();
  rows.forEach((r) => {
    const key = groupBy === "Supplier" ? str(r.supplierName) || "Unknown" : groupBy === "Paymode" ? str(r.paymode) || "Unknown" : seriesKey(r.invoiceNo);
    if (!groups.has(key)) {
      const head = blank();
      if (groupBy === "Supplier") { head.supplierName = (str(r.supplierName) || "Unknown Supplier").toUpperCase(); head.supplierCode = str(r.supplierCode); }
      if (groupBy === "Paymode") head.paymode = (str(r.paymode) || "Unknown").toUpperCase();
      if (groupBy === "Series") head.invoiceNo = key;
      groups.set(key, { head, members: [] });
    }
    groups.get(key)!.members.push(r);
  });
  return [...groups.values()].map(({ head, members }) => ({
    ...head,
    ...Object.fromEntries(MONEY_KEYS.map((k) => [k, toNum(sumDec(members.map((r) => cellNumber(r[k]))))])),
  }));
};

/** Cash / Credit split of the (filtered, ungrouped) bills — exact. */
export const cashCredit = (rows: AnyRow[]) => ({
  cash: toNum(sumDec(rows.filter((r) => lower(r.paymode).includes("cash")).map((r) => cellNumber(r.netAmount)))),
  credit: toNum(sumDec(rows.filter((r) => r.paymode && !lower(r.paymode).includes("cash")).map((r) => cellNumber(r.netAmount)))),
});

export const purchaseTable = (rows: AnyRow[], f: FilterValues, m: PurchaseMasters, columns: ReportColumn[] = PURCHASE_COLUMNS): ReportTable => {
  const filtered = applyPurchaseFallbacks(rows, f, m);
  const { cash, credit } = cashCredit(filtered);
  return {
    columns,
    rows: purchaseRows(filtered, (f.groupBy as PurchaseGroupBy) || "All"),
    summary: [{ label: "Cash", value: cash }, { label: "Credit", value: credit }],
  };
};

const asArray = (v: unknown): AnyRow[] => (Array.isArray(v) ? (v as AnyRow[]) : []);

const supplierOptions = async (): Promise<Option[]> =>
  asArray(await getSupplierList()).map((s) => ({ value: String(s.supplierId), label: s.code ? `[${str(s.code)}] ${str(s.supplierName)}` : str(s.supplierName) }));
const paymodeOptions = async (): Promise<Option[]> =>
  asArray(await getPaymodeList()).map((p) => ({ value: String(p.paymodeId), label: str(p.paymodeName) }));

/** Purchase and Purchase Return footer as the API sends it: one line per paymode, and its totals for the ungrouped list. */
export const purchaseBackendFooter = (data: unknown, f: FilterValues): Pick<ReportTable, "summary" | "totalsOverride"> => {
  const d = data as AnyRow | null;
  const totals = asArray(d?.totalData)[0];
  return {
    summary: asArray(d?.paymodeData).map((p) => ({ label: str(p.paymodeName), value: Number(p.amount) })),
    totalsOverride: totals && (f.groupBy || "All") === "All"
      ? Object.fromEntries(["netValue", "vatAmount", "roundOff", "netAmount"].map((k) => [k, Number(totals[k])]))
      : undefined,
  };
};

interface PurchaseKind {
  id: string;
  title: string;
  rowsKey: "purchaseData" | "purchaseReturnData";
  columns: ReportColumn[];
  footer?: typeof purchaseBackendFooter;
  load: (p: { BranchId: number; SeriesId: number; FromDate: string; ToDate: string; SupplierId: number; PaymodeId: number; Decimals: number }) => Promise<unknown>;
  series: (branchId: number) => Promise<unknown>;
}

const makePurchaseReport = (k: PurchaseKind): ReportDefinition => {
  const seriesOptions = async (f: FilterValues): Promise<Option[]> =>
    asArray(await k.series(Number(f.branch))).map((s) => ({ value: String(s.seriesId), label: str(s.seriesName) }));
  return {
    id: k.id,
    title: k.title,
    columns: k.columns,
    filters: [
      { kind: "select", key: "groupBy", label: "Group by", options: ["All", "Supplier", "Paymode", "Series"].map((v) => ({ label: v, value: v })), default: "All" },
      { kind: "branch", key: "branch" },
      { kind: "lookup", key: "series", label: "Series", queryKey: `${k.id}-series`, load: seriesOptions, dependsOn: ["branch"] },
      { kind: "lookup", key: "supplier", label: "Supplier", queryKey: "suppliers", load: supplierOptions },
      { kind: "lookup", key: "paymode", label: "Paymode", queryKey: "paymodes", load: paymodeOptions },
      { kind: "date", key: "from", label: "From", default: "firstOfMonth" },
      { kind: "date", key: "to", label: "To", default: "today" },
    ],
    fetch: async (f) => {
      const [data, suppliers, paymodes, series] = await Promise.all([
        k.load({
          BranchId: toReportBranchId(f.branch), SeriesId: Number(f.series) || 0, FromDate: f.from, ToDate: f.to,
          SupplierId: Number(f.supplier) || 0, PaymodeId: Number(f.paymode) || 0, Decimals: getDecimalPart(),
        }),
        f.supplier !== "0" ? getSupplierList().catch(() => []) : [],
        f.paymode !== "0" ? getPaymodeList().catch(() => []) : [],
        f.series !== "0" ? k.series(Number(f.branch)).catch(() => []) : [],
      ]);
      const rows = asArray((data as AnyRow | null)?.[k.rowsKey]);
      const table = purchaseTable(rows, f, { suppliers: asArray(suppliers), paymodes: asArray(paymodes), series: asArray(series) }, k.columns);
      return k.footer ? { ...table, ...k.footer(data, f) } : table;
    },
    subtitle: (f) => `${k.title} from ${f.from} To ${f.to}`,
  };
};

export const purchaseReport = makePurchaseReport({
  id: "purchaseReport", title: "Purchase Report", rowsKey: "purchaseData", columns: PURCHASE_REPORT_COLUMNS, footer: purchaseBackendFooter,
  load: getPurchaseReport, series: getSeriesList,
});

export const purchaseReturnReport = makePurchaseReport({
  id: "purchaseReturnReport", title: "Purchase Return Report", rowsKey: "purchaseReturnData", columns: PURCHASE_RETURN_REPORT_COLUMNS, footer: purchaseBackendFooter,
  load: getPurchaseReturnReport, series: getReturnSeriesList,
});

// ── Product Wise Purchase ─────────────────────────────────────────────────────────────
const pwText = (key: string, label: string, align: "left" | "center" = "left"): ReportColumn => ({ key, label, kind: "text", align });
export const PRODUCT_WISE_PURCHASE_COLUMNS: ReportColumn[] = [
  { key: "invoiceDate", label: "Date", kind: "datetime", align: "left" },
  pwText("prNumber", "P/R No", "center"),
  pwText("invoiceNo", "Inv No", "center"),
  pwText("supplierName", "Supplier"),
  pwText("productCode", "Code", "center"),
  pwText("productName", "Product"),
  { key: "qty", label: "Qty", kind: "qty", align: "right" },
  pwText("unit", "Unit", "center"),
  { key: "price", label: "Price", kind: "money", align: "right", total: false },
  money("discount", "Discount"),
  money("netValue", "Net Value"),
  money("vatAmount", "Vat Amt"),
  money("netAmount", "Net Amount"),
];
const PW_SUM_KEYS = ["qty", "discount", "netValue", "vatAmount", "netAmount"];
export type ProductWiseGroupBy = "All" | "Product" | "Supplier";

export const productWiseFallbacks = (rows: AnyRow[], f: FilterValues, m: { suppliers: AnyRow[]; products: AnyRow[] }): AnyRow[] =>
  rows.filter((row) => {
    if (f.supplier && f.supplier !== "0") {
      const sup = m.suppliers.find((s) => String(s.supplierId) === f.supplier);
      if (sup && lower(row.supplierName) !== lower(sup.supplierName)) return false;
    }
    if (f.product && f.product !== "0") {
      const p = m.products.find((x) => String(x.productId) === f.product);
      if (p && lower(row.productnName) !== lower(p.productName) && lower(row.productCode) !== lower(p.code)) return false;
    }
    return true;
  });

/** Rows as the old page showed them, optionally grouped with exact sums. `productnName` is how the API spells it. */
export const productWiseRows = (rows: AnyRow[], groupBy: ProductWiseGroupBy): ReportRow[] => {
  const asRow = (r: AnyRow): ReportRow => ({
    invoiceDate: r.invoiceDate ?? "", prNumber: str(r["p/R Number"]), invoiceNo: str(r.invoiceNo), supplierName: str(r.supplierName).toUpperCase(),
    productCode: str(r.productCode), productName: str(r.productnName).toUpperCase(), qty: cellNumber(r.qty), unit: str(r.unit), price: r.price ?? BLANK_CELL,
    discount: cellNumber(r.discount), netValue: cellNumber(r.netValue), vatAmount: cellNumber(r.vatAmount), netAmount: cellNumber(r.netAmount),
  });
  if (groupBy === "All") return rows.map(asRow);
  const groups = new Map<string, AnyRow[]>();
  rows.forEach((r) => {
    const key = groupBy === "Product" ? str(r.productCode) || str(r.productnName) || "Unknown" : str(r.supplierName) || "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  return Array.from(groups.values(), (members) => {
    const r = members[0];
    return {
      invoiceDate: "", prNumber: "", invoiceNo: "", price: BLANK_CELL,
      supplierName: groupBy === "Supplier" ? (str(r.supplierName) || "Unknown Supplier").toUpperCase() : "",
      productCode: groupBy === "Product" ? str(r.productCode) : "",
      productName: groupBy === "Product" ? (str(r.productnName) || "Unknown Product").toUpperCase() : "",
      unit: groupBy === "Product" ? str(r.unit) : "",
      ...Object.fromEntries(PW_SUM_KEYS.map((k) => [k, toNum(sumDec(members.map((m) => cellNumber(m[k]))))])),
    };
  });
};

export const productWiseTable = (data: unknown, f: FilterValues, m: { suppliers: AnyRow[]; products: AnyRow[] }): ReportTable => {
  const d = data as AnyRow | AnyRow[] | null;
  const raw = Array.isArray(d) ? d : asArray(d?.purchaseData);
  const groupBy = (f.groupBy as ProductWiseGroupBy) || "All";
  const t = (Array.isArray(d) ? null : d?.totalData) as AnyRow | null | undefined;
  // Backend totals, like the old page: only for the ungrouped list. Qty is always the sum of the rows.
  const totalsOverride = t && groupBy === "All"
    ? Object.fromEntries(["discount", "netValue", "vatAmount", "netAmount"].map((k) => [k, Number(t[k])]))
    : undefined;
  return { columns: PRODUCT_WISE_PURCHASE_COLUMNS, rows: productWiseRows(productWiseFallbacks(raw, f, m), groupBy), totalsOverride };
};

export const productWisePurchaseReport: ReportDefinition = {
  id: "productWisePurchaseReport",
  title: "Product Wise Purchase Report",
  columns: PRODUCT_WISE_PURCHASE_COLUMNS,
  filters: [
    { kind: "select", key: "groupBy", label: "Group by", options: ["All", "Product", "Supplier"].map((v) => ({ label: v, value: v })), default: "All" },
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "supplier", label: "Supplier", queryKey: "suppliers", load: supplierOptions },
    { kind: "lookup", key: "product", label: "Product", queryKey: "pwPurchaseProducts", load: async () => asArray(await getPwProductList()).map((p) => ({ value: str(p.productId), label: p.code ? `[${str(p.code)}] ${str(p.productName)}` : str(p.productName) })) },
    { kind: "date", key: "from", label: "From", default: "firstOfMonth" },
    { kind: "date", key: "to", label: "To", default: "today" },
  ],
  search: { placeholder: "Search product, supplier, invoice…", match: (r, t) => ["productName", "productCode", "supplierName", "prNumber", "invoiceNo"].some((k) => lower(r[k]).includes(t)) },
  fetch: async (f) => {
    const params: Parameters<typeof getProductWisePurchaseReport>[0] = { BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart() };
    if (f.product !== "0") params.productId = Number(f.product);
    if (f.supplier !== "0") params.supplierId = Number(f.supplier);
    const [data, suppliers, products] = await Promise.all([
      getProductWisePurchaseReport(params),
      f.supplier !== "0" ? getSupplierList().catch(() => []) : [],
      f.product !== "0" ? getPwProductList().catch(() => []) : [],
    ]);
    return productWiseTable(data, f, { suppliers: asArray(suppliers), products: asArray(products) });
  },
  subtitle: (f) => `Product Wise Purchase Report from ${f.from} To ${f.to}`,
};
