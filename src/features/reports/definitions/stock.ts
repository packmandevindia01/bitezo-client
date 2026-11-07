import { getStockRegisterReport, getGroupList, getCategoryList, getSubCategoryList, getProductTypeList, getProductList as getRegisterProducts } from "../stockRegisterReport/services/stockRegisterReportApi";
import { getStockAdjustmentReport, getEmployeeList as getAdjustmentEmployees } from "../stockAdjustmentReport/services/stockAdjustmentReportApi";
import { getProductWiseStockAdjustmentReport, getProductList as getAdjustmentProducts, getAdjustmentTypeList } from "../productWiseStockAdjustmentReport/services/productWiseStockAdjustmentReportApi";
import { getStockTransferReport, getBranchList as getTransferBranches, getEmployeeList as getTransferEmployees } from "../stockTransferReport/services/stockTransferReportApi";
import { getProductWiseStockTransferReport, getProductList as getTransferProducts } from "../productWiseStockTransferReport/services/productWiseStockTransferReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { ALL_BRANCH_ID, toReportBranchId } from "../../../hooks/useBranchScope";
import { sumDec, toNum } from "../../../shared/lib/money";
import { asArray, center, date, dateFilters, dateRangeSubtitle, has, lower, money, productOptions, qty, selected, str, text, type AnyRow, type Option } from "./helpers";
import { BLANK_CELL, cellNumber } from "../framework/reportMath";
import type { FilterValues, ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";

/**
 * Stock Register, Stock Adjustment and Stock Transfer reports on the framework (Phase 4, batch 3).
 * Same params, client fallbacks, Group by and search as the old pages. BranchId is never sent as 0.
 */
// ── Stock Register ────────────────────────────────────────────────────────────────────
export const STOCK_REGISTER_COLUMNS: ReportColumn[] = [
  center("productCode", "Code"),
  text("productName", "Product"),
  text("group", "Group"),
  text("category", "Category"),
  text("stock", "Stock", "right"),
  money("cost", "Cost", false),
  money("value", "Value"),
];

export interface StockRegisterMasters { groups: AnyRow[]; categories: AnyRow[]; products: AnyRow[] }
export type StockRegisterGroupBy = "All" | "Group" | "Category";

/** Client fallbacks of the old page: rows are matched by name against the selected master. */
export const applyStockRegisterFallbacks = (rows: AnyRow[], f: FilterValues, m: StockRegisterMasters): AnyRow[] =>
  rows.filter((row) => {
    if (selected(f.group)) {
      const g = m.groups.find((x) => str(x.id) === f.group);
      if (g && lower(row.group) !== lower(g.name)) return false;
    }
    if (selected(f.category)) {
      const c = m.categories.find((x) => str(x.id) === f.category);
      if (c && lower(row.category) !== lower(c.name)) return false;
    }
    if (selected(f.product)) {
      const p = m.products.find((x) => str(x.productId) === f.product);
      if (p && lower(row.productName) !== lower(p.productName) && lower(row.productCode) !== lower(p.code)) return false;
    }
    return true;
  });

export const stockRegisterRows = (rows: AnyRow[], groupBy: StockRegisterGroupBy): ReportRow[] => {
  if (groupBy === "All") return rows as ReportRow[];
  const key = groupBy === "Group" ? "group" : "category";
  const groups = new Map<string, AnyRow[]>();
  rows.forEach((r) => {
    const k = str(r[key]) || "Unknown";
    groups.set(k, [...(groups.get(k) ?? []), r]);
  });
  return Array.from(groups, ([name, members]) => ({
    productCode: "", productName: "", group: "", category: "", stock: "", cost: BLANK_CELL,
    [key]: name === "Unknown" ? `Unknown ${groupBy}` : name,
    value: toNum(sumDec(members.map((r) => cellNumber(r.value)))),
  }));
};

export const stockRegisterReport: ReportDefinition = {
  id: "stockRegisterReport",
  title: "Stock Register Report",
  columns: STOCK_REGISTER_COLUMNS,
  filters: [
    { kind: "select", key: "groupBy", label: "Group by", options: ["All", "Group", "Category"].map((v) => ({ label: v, value: v })), default: "All" },
    { kind: "branch", key: "branch" },
    { kind: "date", key: "asOn", label: "As On", default: "today" },
    { kind: "lookup", key: "group", label: "Group", queryKey: "stockRegisterGroups", load: async () => asArray(await getGroupList()).map((g) => ({ value: str(g.id), label: str(g.name) })) },
    { kind: "lookup", key: "category", label: "Category", queryKey: "stockRegisterCategories", load: async () => asArray(await getCategoryList()).map((c) => ({ value: str(c.id), label: str(c.name) })) },
    { kind: "lookup", key: "subCategory", label: "Sub Category", queryKey: "stockRegisterSubCategories", dependsOn: ["category"], load: async (f) => asArray(await getSubCategoryList(Number(f.category))).map((s) => ({ value: str(s.id), label: str(s.name) })) },
    { kind: "lookup", key: "productType", label: "Type", queryKey: "stockRegisterProductTypes", load: async () => asArray(await getProductTypeList()).map((t) => ({ value: str(t.productTypeId), label: str(t.productTypeName) })) },
    { kind: "lookup", key: "product", label: "Product", queryKey: "stockRegisterProducts", load: productOptions(getRegisterProducts) },
  ],
  search: { placeholder: "Search product, code, group…", match: (r, t) => has(r, ["productName", "productCode", "group", "category"], t) },
  // Grouped rows have no product of their own.
  rowLink: (r) => (r.productId && r.productName ? `/dashboard/reports/product-transaction-log?product=${str(r.productId)}&productName=${encodeURIComponent(str(r.productName))}` : null),
  fetch: async (f) => {
    const params: Parameters<typeof getStockRegisterReport>[0] = { BranchId: toReportBranchId(f.branch), AsOndate: f.asOn, Decimals: getDecimalPart() };
    if (selected(f.group)) params.GroupId = Number(f.group);
    if (selected(f.category)) params.CategoryId = Number(f.category);
    if (selected(f.subCategory)) params.SubCategoryId = Number(f.subCategory);
    if (selected(f.productType)) params.ProductTypeId = Number(f.productType);
    if (selected(f.product)) params.ProductId = Number(f.product);
    const [data, groups, categories, products] = await Promise.all([
      getStockRegisterReport(params),
      selected(f.group) ? getGroupList().catch(() => []) : [],
      selected(f.category) ? getCategoryList().catch(() => []) : [],
      selected(f.product) ? getRegisterProducts().catch(() => []) : [],
    ]);
    const rows = applyStockRegisterFallbacks(asArray((data as unknown as AnyRow | null)?.productData), f, { groups: asArray(groups), categories: asArray(categories), products: asArray(products) });
    return { columns: STOCK_REGISTER_COLUMNS, rows: stockRegisterRows(rows, (f.groupBy as StockRegisterGroupBy) || "All") };
  },
  subtitle: (f) => `Stock Register as on ${f.asOn}`,
};

// ── Stock Adjustment ──────────────────────────────────────────────────────────────────
export const STOCK_ADJUSTMENT_COLUMNS: ReportColumn[] = [
  date("transDate", "Trans Date"), center("refNo", "Ref No"), text("branch", "Branch"), text("employee", "Employee"), money("netAmount", "Net Amount"),
];

export const stockAdjustmentReport: ReportDefinition = {
  id: "stockAdjustmentReport",
  title: "Stock Adjustment Report",
  columns: STOCK_ADJUSTMENT_COLUMNS,
  filters: [
    { kind: "branch", key: "branch", label: "Branch" },
    {
      kind: "lookup", key: "employee", label: "Employee", allLabel: "All Employees", queryKey: "stockAdjustmentEmployees", dependsOn: ["branch"],
      load: async (f) => {
        const id = toReportBranchId(f.branch);
        return asArray(await getAdjustmentEmployees(id > ALL_BRANCH_ID ? id : undefined)).map((e) => ({ value: str(e.empId), label: str(e.empName) }));
      },
    },
    ...dateFilters,
  ],
  fetch: async (f): Promise<ReportTable> => ({
    columns: STOCK_ADJUSTMENT_COLUMNS,
    rows: (await getStockAdjustmentReport({ branchId: f.branch, employeeId: f.employee, fromDate: f.from, toDate: f.to })) as unknown as ReportRow[],
  }),
  subtitle: dateRangeSubtitle("Stock Adjustment Report"),
};

// ── Product Wise Stock Adjustment ─────────────────────────────────────────────────────
export const PW_STOCK_ADJUSTMENT_COLUMNS: ReportColumn[] = [
  date("transDate", "Date"), center("refNo", "Ref No"), center("code", "Code"), text("product", "Product"), qty(), center("unit", "Unit"),
  money("price", "Price", false), money("netAmount", "Net Amount"), center("type", "Type"), center("effect", "Effect"),
];

export const productWiseStockAdjustmentReport: ReportDefinition = {
  id: "productWiseStockAdjustmentReport",
  title: "Product Wise Stock Adjustment Report",
  columns: PW_STOCK_ADJUSTMENT_COLUMNS,
  filters: [
    { kind: "branch", key: "branch", label: "Branch" },
    { kind: "lookup", key: "product", label: "Product", allLabel: "All Products", queryKey: "stockAdjustmentProducts", load: productOptions(getAdjustmentProducts) },
    { kind: "lookup", key: "type", label: "Type", allLabel: "All Types", queryKey: "stockAdjustmentTypes", load: async () => asArray(await getAdjustmentTypeList()).map((t) => ({ value: str(t.typeId), label: str(t.typeName) })) },
    { kind: "select", key: "effect", label: "Effect", options: [{ label: "All", value: "" }, { label: "In (+)", value: "+" }, { label: "Out (-)", value: "-" }], default: "" },
    ...dateFilters,
  ],
  search: { placeholder: "Search product, code…", match: (r, t) => has(r, ["product", "code", "type", "refNo"], t) },
  fetch: async (f) => ({
    columns: PW_STOCK_ADJUSTMENT_COLUMNS,
    rows: asArray(await getProductWiseStockAdjustmentReport({
      BranchId: toReportBranchId(f.branch), ProductId: Number(f.product) || 0, TypeId: Number(f.type) || 0, Effect: f.effect ?? "",
      FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
    })) as ReportRow[],
  }),
  subtitle: dateRangeSubtitle("Product Wise Stock Adjustment Report"),
};

// ── Stock Transfer ────────────────────────────────────────────────────────────────────
/** To Branch: one "All Branches" option (sent as 1 = All; the API rejects 0), so the list leaves out the backend's own "All". */
const toBranchOptions = async (): Promise<Option[]> =>
  asArray(await getTransferBranches()).filter((b) => Number(b.branchId) !== ALL_BRANCH_ID).map((b) => ({ value: str(b.branchId), label: str(b.branchName) }));

export const STOCK_TRANSFER_COLUMNS: ReportColumn[] = [
  date("transDate", "Date"), center("refNo", "Ref No"), text("fromBranch", "From Branch"), text("toBranch", "To Branch"), text("employee", "Employee"), money("netAmount", "Net Amount"),
];

export const stockTransferReport: ReportDefinition = {
  id: "stockTransferReport",
  title: "Stock Transfer Report",
  columns: STOCK_TRANSFER_COLUMNS,
  filters: [
    { kind: "branch", key: "fromBranch", label: "From" },
    { kind: "lookup", key: "toBranch", label: "To", allLabel: "All Branches", queryKey: "stockTransferToBranches", load: toBranchOptions },
    {
      kind: "lookup", key: "employee", label: "Employee", allLabel: "All Employees", queryKey: "stockTransferEmployees", dependsOn: ["fromBranch"],
      load: async (f) => asArray(await getTransferEmployees(toReportBranchId(f.fromBranch))).map((e) => ({ value: str(e.empId), label: str(e.empName) })),
    },
    ...dateFilters,
  ],
  search: { placeholder: "Search branch, employee…", match: (r, t) => has(r, ["fromBranch", "toBranch", "employee", "refNo"], t) },
  fetch: async (f) => ({
    columns: STOCK_TRANSFER_COLUMNS,
    rows: asArray(await getStockTransferReport({
      FromBranchId: toReportBranchId(f.fromBranch), ToBranchId: toReportBranchId(f.toBranch), EmployeeId: Number(f.employee) || 0,
      FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
    })) as ReportRow[],
  }),
  subtitle: dateRangeSubtitle("Stock Transfer Report"),
};

// ── Product Wise Stock Transfer ───────────────────────────────────────────────────────
export const PW_STOCK_TRANSFER_COLUMNS: ReportColumn[] = [
  date("transDate", "Date"), center("refNo", "Ref No"), text("fromBranch", "From Branch"), text("toBranch", "To Branch"), center("code", "Code"), text("product", "Product"),
  qty(), center("unit", "Unit"), money("price", "Price", false), money("netAmount", "Net Amount"),
];

export const productWiseStockTransferReport: ReportDefinition = {
  id: "productWiseStockTransferReport",
  title: "Product Wise Stock Transfer Report",
  columns: PW_STOCK_TRANSFER_COLUMNS,
  filters: [
    { kind: "branch", key: "fromBranch", label: "From" },
    { kind: "lookup", key: "toBranch", label: "To", allLabel: "All Branches", queryKey: "stockTransferToBranches", load: toBranchOptions },
    { kind: "lookup", key: "product", label: "Product", allLabel: "All Products", queryKey: "stockTransferProducts", load: productOptions(getTransferProducts) },
    ...dateFilters,
  ],
  search: { placeholder: "Search product, branch…", match: (r, t) => has(r, ["product", "code", "fromBranch", "toBranch", "refNo"], t) },
  fetch: async (f) => ({
    columns: PW_STOCK_TRANSFER_COLUMNS,
    rows: asArray(await getProductWiseStockTransferReport({
      FromBranchId: toReportBranchId(f.fromBranch), ToBranchId: toReportBranchId(f.toBranch), ProductId: Number(f.product) || 0,
      FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart(),
    })) as ReportRow[],
  }),
  subtitle: dateRangeSubtitle("Product Wise Stock Transfer Report"),
};
