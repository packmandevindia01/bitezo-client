import { fetchCustomerStatement } from "../customerStatement/services/customerStatementApi";
import { fetchSupplierStatement } from "../supplierStatement/services/supplierStatementApi";
import { fetchCustomerBalance } from "../customerBalance/services/customerBalanceApi";
import { fetchSupplierBalance } from "../supplierBalance/services/supplierBalanceApi";
import { getCustomerList } from "../billWiseMarginReport/services/billWiseMarginReportApi";
import { getSupplierList } from "../purchaseReport/services/purchaseReportApi";
import { getDecimalPart } from "../../../shared/lib/currency";
import { toReportBranchId } from "../../../hooks/useBranchScope";
import type { ReportColumn, ReportDefinition, ReportRow, ReportTable } from "../framework/types";
import { asArray, backendTotals, center, date, dateFilters, dateRangeSubtitle, money, str, text, type AnyRow, type Option } from "./helpers";

/** Customer / Supplier Statement and Balance (Phase 4): one factory each, the twins differ only by party. */
const customerOptions = async (): Promise<Option[]> =>
  asArray(await getCustomerList()).map((c) => ({ value: str(c.customerId), label: c.code ? `[${str(c.code)}] ${str(c.customerName)}` : str(c.customerName) }));
const supplierOptions = async (): Promise<Option[]> =>
  asArray(await getSupplierList()).map((s) => ({ value: str(s.supplierId), label: s.code ? `[${str(s.code)}] ${str(s.supplierName)}` : str(s.supplierName) }));

// ── Statement ─────────────────────────────────────────────────────────────────────────
export const STATEMENT_COLUMNS: ReportColumn[] = [
  date("invoiceDate", "Date"), text("invoiceNo", "Invoice No"), text("voucherType", "Voucher Type"), money("invoiceAmount", "Invoice Amount"), money("balance", "Balance"),
];

const makeStatement = (k: { id: string; title: string; party: string; options: () => Promise<Option[]>; load: (partyId: number, f: Record<string, string>) => Promise<unknown> }): ReportDefinition => ({
  id: k.id,
  title: k.title,
  columns: STATEMENT_COLUMNS,
  filters: [
    { kind: "branch", key: "branch" },
    { kind: "lookup", key: "party", label: k.party, queryKey: `${k.id}-parties`, allLabel: `Select ${k.party}`, load: k.options },
    ...dateFilters,
  ],
  requires: { key: "party", message: `Select a ${k.party.toLowerCase()} to view the statement.` },
  fetch: async (f) => ({
    columns: STATEMENT_COLUMNS,
    rows: asArray(((await k.load(Number(f.party), f)) as AnyRow | null)?.data) as ReportRow[],
  }),
  subtitle: dateRangeSubtitle(k.title),
});

export const customerStatementReport = makeStatement({
  id: "customerStatement", title: "Customer Statement", party: "Customer", options: customerOptions,
  load: (id, f) => fetchCustomerStatement({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, CustomerId: id, Decimals: getDecimalPart() }),
});
export const supplierStatementReport = makeStatement({
  id: "supplierStatement", title: "Supplier Statement", party: "Supplier", options: supplierOptions,
  load: (id, f) => fetchSupplierStatement({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, SupplierId: id, Decimals: getDecimalPart() }),
});

// ── Balance ───────────────────────────────────────────────────────────────────────────
const balanceColumns = (party: string): ReportColumn[] => [
  center("code", "Code"), text("name", `${party} Name`), money("opening", "Opening"), money("issued", "Issued"), money("paid", "Paid"), money("balance", "Balance"),
];

/** Balance total = backend `total` when sent, otherwise the sum (the old page showed 0 when it was missing). */
export const balanceTable = (response: unknown, columns: ReportColumn[]): ReportTable => {
  const d = (response as AnyRow | null)?.data as AnyRow | null | undefined;
  const total = backendTotals(d?.totalData, ["total"])?.total;
  return { columns, rows: asArray(d?.summaryData) as ReportRow[], totalsOverride: total === undefined ? undefined : { balance: total } };
};

const makeBalance = (k: { id: string; title: string; party: string; options: () => Promise<Option[]>; load: (partyId: number, f: Record<string, string>) => Promise<unknown> }): ReportDefinition => {
  const columns = balanceColumns(k.party);
  return {
    id: k.id,
    title: k.title,
    columns,
    filters: [
      { kind: "branch", key: "branch" },
      { kind: "lookup", key: "party", label: k.party, queryKey: `${k.id}-parties`, load: k.options },
      ...dateFilters,
    ],
    fetch: async (f) => balanceTable(await k.load(Number(f.party) || 0, f), columns),
    subtitle: dateRangeSubtitle(k.title),
  };
};

export const customerBalanceReport = makeBalance({
  id: "customerBalance", title: "Customer Balance", party: "Customer", options: customerOptions,
  load: (id, f) => fetchCustomerBalance({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, CustomerId: id, Decimals: getDecimalPart() }),
});
export const supplierBalanceReport = makeBalance({
  id: "supplierBalance", title: "Supplier Balance", party: "Supplier", options: supplierOptions,
  load: (id, f) => fetchSupplierBalance({ BranchId: toReportBranchId(f.branch), FromDate: f.from, ToDate: f.to, SupplierId: id, Decimals: getDecimalPart() }),
});
