import { getProductOutputVatReport, getProductList as getOutputProducts, getVatList as getOutputVats } from "../productOutputVatReport/services/productOutputVatReportApi";
import { getProductInputVatReport, getProductList as getInputProducts, getVatList as getInputVats } from "../productInputVatReport/services/productInputVatReportApi";
import { getBillWiseLevyReport } from "../billWiseLevyReport/services/billWiseLevyReportApi";
import { getProductWiseLevyReport } from "../productWiseLevyReport/services/productWiseLevyReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import type { FilterValues, ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";
import { asArray, backendTotals, center, date, dateRangeSubtitle, money, selected, str, text, todayFilters, type AnyRow, type Option } from "./helpers";

/**
 * Product Output / Input VAT and Bill / Product Wise Levy reports (Phase 4). Same params, field fallbacks and
 * totals as the old pages: backend totalData when sent, otherwise the exact sum of the rows.
 */
const VAT_KEYS = ["value", "vatAmount", "netAmount"];
const LEVY_KEYS = ["netValue", "serviceCharge", "levy", "vatAmount", "netAmount"];

const productCode = (r: AnyRow) => str(r.code || r.productCode || "-");
const productName = (r: AnyRow) => str(r.product || r.productName || r.name || "-");
export const vatPercent = (r: AnyRow) => {
  if (r.vatPer === undefined || r.vatPer === null) return "-";
  const v = str(r.vatPer);
  return v.endsWith("%") ? v : `${v}%`;
};

const params = (f: FilterValues) => ({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart() });
const levyColumns: ReportColumn[] = [money("netValue", "Net Value"), money("serviceCharge", "Service Charge"), money("levy", "Levy"), money("vatAmount", "VAT Amount"), money("netAmount", "Net Amount")];

// ── VAT ───────────────────────────────────────────────────────────────────────────────
export const VAT_COLUMNS: ReportColumn[] = [
  center("productCode", "Product Code"), text("productName", "Product Name"), center("vatPercent", "VAT %"),
  money("value", "Value"), money("vatAmount", "VAT Amount"), money("netAmount", "Net Amount"),
];

export const vatTable = (data: unknown): ReportTable => {
  const d = data as AnyRow | AnyRow[] | null | undefined;
  const raw = Array.isArray(d) ? d : asArray(d?.outPutData ?? d?.inputData ?? d?.inPutData);
  return {
    columns: VAT_COLUMNS,
    rows: raw.map((r): ReportRow => ({ ...r, productCode: productCode(r), productName: productName(r), vatPercent: vatPercent(r) })),
    totalsOverride: Array.isArray(d) ? undefined : backendTotals(d?.totalData, VAT_KEYS),
  };
};

const vatProductOption = (p: AnyRow): Option => {
  const id = str(p.productId ?? p.id);
  const name = str(p.productName ?? p.name);
  const code = str(p.productCode ?? p.code);
  return { value: id, label: (code ? `${code} - ${name}` : name) || id };
};
const vatOption = (v: AnyRow): Option => {
  const id = str(v.vatId ?? v.id);
  return { value: id, label: str(v.vatName ?? v.name ?? (v.value !== undefined ? `${str(v.value)}%` : `VAT ${id}`)) };
};

const makeVatReport = (k: {
  id: string; title: string; load: (p: ReturnType<typeof params> & { productId?: number; vatId?: number }) => Promise<unknown>;
  products: () => Promise<unknown>; vats: () => Promise<unknown>;
}): ReportDefinition => ({
  id: k.id,
  title: k.title,
  columns: VAT_COLUMNS,
  filters: [
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "product", label: "Product", queryKey: `${k.id}-products`, load: async () => asArray(await k.products()).filter((p) => (p.productId ?? p.id) !== undefined).map(vatProductOption) },
    { kind: "lookup", key: "vat", label: "VAT", queryKey: `${k.id}-vats`, load: async () => asArray(await k.vats()).filter((v) => (v.vatId ?? v.id) !== undefined).map(vatOption) },
    ...todayFilters,
  ],
  fetch: async (f) => vatTable(await k.load({
    ...params(f),
    productId: selected(f.product) ? Number(f.product) : undefined,
    vatId: selected(f.vat) ? Number(f.vat) : undefined,
  })),
  subtitle: dateRangeSubtitle(k.title),
});

export const productOutputVatReport = makeVatReport({ id: "productOutputVatReport", title: "Product Output VAT Report", load: getProductOutputVatReport as never, products: getOutputProducts, vats: getOutputVats });
export const productInputVatReport = makeVatReport({ id: "productInputVatReport", title: "Product Input VAT Report", load: getProductInputVatReport as never, products: getInputProducts, vats: getInputVats });

// ── Levy ──────────────────────────────────────────────────────────────────────────────
export const BILL_LEVY_COLUMNS: ReportColumn[] = [date("invDate", "Bill Date"), center("billNo", "Bill No"), ...levyColumns];

export const billLevyTable = (data: unknown): ReportTable => {
  const d = data as AnyRow | null | undefined;
  return {
    columns: BILL_LEVY_COLUMNS,
    rows: asArray(d?.billData).map((r): ReportRow => ({ ...r, billNo: str(r.invNo || r.billNo || r.invoiceNo || "-") })),
    totalsOverride: backendTotals(d?.totalData, LEVY_KEYS),
  };
};

export const billWiseLevyReport: ReportDefinition = {
  id: "billWiseLevyReport",
  title: "Bill Wise Levy Report",
  columns: BILL_LEVY_COLUMNS,
  filters: [{ kind: "branch", key: "branch" }, ...todayFilters],
  fetch: async (f) => billLevyTable(await getBillWiseLevyReport(params(f))),
  subtitle: dateRangeSubtitle("Bill Wise Levy Report"),
};

export const PRODUCT_LEVY_COLUMNS: ReportColumn[] = [center("productCode", "Product Code"), text("productName", "Product Name"), ...levyColumns];

export const productLevyTable = (data: unknown): ReportTable => {
  const d = data as AnyRow | AnyRow[] | null | undefined;
  const raw = Array.isArray(d) ? d : asArray(d?.productData ?? d?.productsData ?? d?.outPutData);
  return {
    columns: PRODUCT_LEVY_COLUMNS,
    rows: raw.map((r): ReportRow => ({ ...r, productCode: productCode(r), productName: productName(r) })),
    totalsOverride: Array.isArray(d) ? undefined : backendTotals(d?.totalData, LEVY_KEYS),
  };
};

export const productWiseLevyReport: ReportDefinition = {
  id: "productWiseLevyReport",
  title: "Product Wise Levy Report",
  columns: PRODUCT_LEVY_COLUMNS,
  filters: [{ kind: "branch", key: "branch" }, ...todayFilters],
  fetch: async (f) => productLevyTable(await getProductWiseLevyReport(params(f))),
  subtitle: dateRangeSubtitle("Product Wise Levy Report"),
};
