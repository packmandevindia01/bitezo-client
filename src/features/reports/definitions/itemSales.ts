import { getCategoryWiseSalesReport, getCategoryList } from "../categoryWiseSalesReport/services/categoryWiseSalesReportApi";
import { getGroupWiseSalesReport, getGroupList } from "../groupWiseSalesReport/services/groupWiseSalesReportApi";
import { getEmployeeSalesReport } from "../employeeSalesReport/services/employeeSalesReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import { cellNumber } from "../framework/reportMath";
import type { FilterValues, ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";

/**
 * Category-wise, Group-wise and Employee sales on the report framework (Phase 4, batch 1).
 * Same rules as the old pages: row field fallbacks, Category name resolved against the category master,
 * money totals = backend `totalData` when sent (else the sum), Qty total = sum. BranchId never 0.
 */
type AnyRow = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());
const first = (row: AnyRow, keys: string[]) => { for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k]; return undefined; };
const validName = (s: string) => (s && s !== "-" && s !== "null" && s !== "undefined" ? s : "");

const money = (key: string, label: string): ReportColumn => ({ key, label, kind: "money", align: "right" });
const SALES_COLUMNS: ReportColumn[] = [
  { key: "qty", label: "Qty", kind: "qty", align: "right" },
  money("amount", "Amount"),
  money("discount", "Discount"),
  money("netValue", "Net Value"),
  money("vatAmount", "VAT Amount"),
  money("netAmount", "Net Amount"),
];
const MONEY_KEYS = ["amount", "discount", "netValue", "vatAmount", "netAmount"];

const salesValues = (row: AnyRow): ReportRow => ({
  qty: cellNumber(first(row, ["qty", "quantity", "totalQty"]) ?? 0),
  amount: row.amount, discount: row.discount, netValue: row.netValue, vatAmount: row.vatAmount, netAmount: row.netAmount,
});

/** Backend totalData (object or [object]) → override for the money columns (each falls back to the sum). */
export const totalsFromBackend = (totalData: unknown): Record<string, number> | undefined => {
  const t = (Array.isArray(totalData) ? totalData[0] : totalData) as AnyRow | null | undefined;
  if (!t || typeof t !== "object") return undefined;
  const out: Record<string, number> = {};
  MONEY_KEYS.forEach((k) => { if (t[k] !== undefined && t[k] !== null) out[k] = Number(t[k]); });
  return out;
};

const rowsOf = (data: unknown, key: string): AnyRow[] => {
  const d = data as AnyRow | AnyRow[] | null | undefined;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  for (const k of [key, "data", "rows"]) if (Array.isArray(d[k])) return d[k] as AnyRow[];
  return [];
};

const dateParams = (f: FilterValues) => ({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, Decimals: getDecimalPart() });
const dateFilters = (from: "today" | "firstOfMonth") => [
  { kind: "date" as const, key: "from", label: "From", default: from },
  { kind: "date" as const, key: "to", label: "To", default: "today" as const },
];

// ── Category ──────────────────────────────────────────────────────────────────
export interface MasterEntry { id: number; code: string; name: string }

export const categoryMaster = (list: unknown): MasterEntry[] => {
  const arr = Array.isArray(list) ? list : Array.isArray((list as AnyRow)?.data) ? ((list as AnyRow).data as AnyRow[]) : [];
  return (arr as AnyRow[]).filter(Boolean).map((c) => ({
    id: Number(c.catId ?? c.categoryId ?? c.id ?? 0),
    code: str(c.catCode ?? c.code ?? c.categoryCode),
    name: str(c.catName ?? c.name ?? c.categoryName ?? c.catgeory ?? c.category),
  }));
};

/** Category name exactly as the old hook resolved it. */
export const resolveCategoryName = (row: AnyRow, master: MasterEntry[], selectedId: string, rowCount: number): string => {
  const byId = new Map(master.filter((m) => m.id).map((m) => [m.id, m]));
  const byCode = new Map(master.filter((m) => m.code).map((m) => [m.code.toLowerCase(), m]));
  const byName = new Map(master.filter((m) => m.name).map((m) => [m.name.toLowerCase(), m]));
  const rawId = row.categoryId ?? row.catId ?? row.category_id ?? row.cat_id ?? row.id ?? row.Id ?? (typeof row.category === "number" ? row.category : undefined);
  const rawCode = str(first(row, ["categoryCode", "catCode", "category_code", "cat_code", "code", "CategoryCode", "CatCode", "Code", "categorycode"]));
  const rawName = str(first(row, ["categoryName", "catName", "category_name", "cat_name", "catgeory", "category", "Catgeory", "Category", "CategoryName", "CatName", "name", "Name", "categoryname"]));
  const sel = selectedId && selectedId !== "0" ? Number(selectedId) : 0;
  const match =
    (rawId && byId.get(Number(rawId))) ||
    (rawCode && byCode.get(rawCode.toLowerCase())) ||
    (rawName && byName.get(rawName.toLowerCase())) ||
    (rawCode && !isNaN(Number(rawCode)) && byId.get(Number(rawCode))) ||
    (sel && rowCount === 1 && byId.get(sel)) ||
    undefined;
  return validName(rawName) || match?.name || (sel && byId.get(sel)?.name) || "Uncategorized";
};

export const categoryTable = (data: unknown, master: MasterEntry[], selectedId: string): ReportTable => {
  const raw = rowsOf(data, "categoryData");
  return {
    columns: [{ key: "category", label: "Category", kind: "text", align: "left" }, ...SALES_COLUMNS],
    rows: raw.map((r) => ({ category: resolveCategoryName(r, master, selectedId, raw.length), ...salesValues(r) })),
    totalsOverride: totalsFromBackend((data as AnyRow | null)?.totalData),
  };
};

const categoryOptions = async () =>
  categoryMaster(await getCategoryList()).map((c) => ({ value: String(c.id), label: c.name }));

export const categoryWiseSalesReport: ReportDefinition = {
  id: "categoryWiseSalesReport",
  title: "Category Wise Sales Report",
  filters: [
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "category", label: "Category", queryKey: "categories", load: categoryOptions },
    ...dateFilters("today"),
  ],
  fetch: async (f) => {
    const [data, list] = await Promise.all([
      getCategoryWiseSalesReport({ ...dateParams(f), CategoryId: Number(f.category) || 0 }),
      getCategoryList().catch(() => []),
    ]);
    return categoryTable(data, categoryMaster(list), f.category);
  },
  subtitle: (f) => `Category Wise Sales Report from ${f.from} To ${f.to}`,
};

// ── Group ─────────────────────────────────────────────────────────────────────
export const groupTable = (data: unknown): ReportTable => ({
  columns: [
    { key: "code", label: "Code", kind: "text", align: "left" },
    { key: "group", label: "Group", kind: "text", align: "left" },
    ...SALES_COLUMNS,
  ],
  rows: rowsOf(data, "groupData").map((r) => ({
    code: String(r.groupCode || r.code || r.groupId || r.grpId || "-"),
    group: String(r.groupName || r.name || r.group || "-"),
    ...salesValues(r),
  })),
  totalsOverride: totalsFromBackend((data as AnyRow | null)?.totalData),
});

export const groupWiseSalesReport: ReportDefinition = {
  id: "groupWiseSalesReport",
  title: "Group Wise Sales Report",
  filters: [
    { kind: "branch", key: "branch" },
    {
      kind: "lookup", key: "group", label: "Group", queryKey: "groups",
      load: async () => ((await getGroupList()) as unknown as AnyRow[] ?? []).map((g) => ({ value: String(g.grpId), label: String(g.name ?? "") })),
    },
    ...dateFilters("today"),
  ],
  fetch: async (f) => groupTable(await getGroupWiseSalesReport({ ...dateParams(f), GroupId: Number(f.group) || 0 })),
  subtitle: (f) => `Group Wise Sales Report from ${f.from} To ${f.to}`,
};

// ── Employee ──────────────────────────────────────────────────────────────────
export const employeeTable = (rows: unknown): ReportTable => ({
  columns: [
    { key: "code", label: "Code", kind: "text", align: "left" },
    { key: "employee", label: "Employee", kind: "text", align: "left" },
    money("netValue", "Net Value"),
    money("vatAmount", "VAT Amount"),
    money("netAmount", "Net Amount"),
  ],
  rows: (Array.isArray(rows) ? (rows as AnyRow[]) : []).map((r) => ({
    code: str(r.code), employee: str(r.employee).toUpperCase(), netValue: r.netValue, vatAmount: r.vatAmount, netAmount: r.netAmount,
  })),
});

export const employeeSalesReport: ReportDefinition = {
  id: "employeeSalesReport",
  title: "Employee Sales Report",
  filters: [{ kind: "branch", key: "branch" }, ...dateFilters("firstOfMonth")],
  fetch: async (f) => employeeTable(await getEmployeeSalesReport(dateParams(f))),
  subtitle: (f) => `Employee Sales Report from ${f.from} To ${f.to}`,
};
