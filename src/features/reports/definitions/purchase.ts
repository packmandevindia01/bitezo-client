import { getPurchaseReport, getPaymodeList, getSupplierList, getSeriesList } from "../purchaseReport/services/purchaseReportApi";
import { getPurchaseReturnReport, getSeriesList as getReturnSeriesList } from "../purchaseReturnReport/services/purchaseReturnReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import { sumDec, toNum } from "../../../shared/lib/money";
import { cellNumber } from "../framework/reportMath";
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

const blank = (): ReportRow => ({ invoiceDate: "", invoiceNo: "", refNo: "", supplierName: "", supplierCode: "", employee: "", paymode: "" });

/** Rows as the old page showed them (supplier upper-case), optionally grouped with exact sums. */
export const purchaseRows = (rows: AnyRow[], groupBy: PurchaseGroupBy): ReportRow[] => {
  const asRow = (r: AnyRow): ReportRow => ({
    invoiceDate: r.invoiceDate ?? "",
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

export const purchaseTable = (rows: AnyRow[], f: FilterValues, m: PurchaseMasters): ReportTable => {
  const filtered = applyPurchaseFallbacks(rows, f, m);
  const { cash, credit } = cashCredit(filtered);
  return {
    columns: PURCHASE_COLUMNS,
    rows: purchaseRows(filtered, (f.groupBy as PurchaseGroupBy) || "All"),
    summary: [{ label: "Cash", value: cash }, { label: "Credit", value: credit }],
  };
};

const asArray = (v: unknown): AnyRow[] => (Array.isArray(v) ? (v as AnyRow[]) : []);

const supplierOptions = async (): Promise<Option[]> =>
  asArray(await getSupplierList()).map((s) => ({ value: String(s.supplierId), label: s.code ? `[${str(s.code)}] ${str(s.supplierName)}` : str(s.supplierName) }));
const paymodeOptions = async (): Promise<Option[]> =>
  asArray(await getPaymodeList()).map((p) => ({ value: String(p.paymodeId), label: str(p.paymodeName) }));

interface PurchaseKind {
  id: string;
  title: string;
  rowsKey: "purchaseData" | "purchaseReturnData";
  load: (p: { BranchId: number; SeriesId: number; FromDate: string; ToDate: string; SupplierId: number; PaymodeId: number; Decimals: number }) => Promise<unknown>;
  series: (branchId: number) => Promise<unknown>;
}

const makePurchaseReport = (k: PurchaseKind): ReportDefinition => {
  const seriesOptions = async (f: FilterValues): Promise<Option[]> =>
    asArray(await k.series(Number(f.branch))).map((s) => ({ value: String(s.seriesId), label: str(s.seriesName) }));
  return {
    id: k.id,
    title: k.title,
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
      return purchaseTable(rows, f, { suppliers: asArray(suppliers), paymodes: asArray(paymodes), series: asArray(series) });
    },
    subtitle: (f) => `${k.title} from ${f.from} To ${f.to}`,
  };
};

export const purchaseReport = makePurchaseReport({
  id: "purchaseReport", title: "Purchase Report", rowsKey: "purchaseData",
  load: getPurchaseReport, series: getSeriesList,
});

export const purchaseReturnReport = makePurchaseReport({
  id: "purchaseReturnReport", title: "Purchase Return Report", rowsKey: "purchaseReturnData",
  load: getPurchaseReturnReport, series: getReturnSeriesList,
});
