/**
 * Phase 4, batch 2 — Purchase / Purchase Return on the report framework, compared with the old pages'
 * logic (client fallback filters, Group by, Cash / Credit, totals to the fil).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { toMatrix, formatReportDateTime, type Formatter } from "@features/reports/framework/reportMath";
import { applyPurchaseFallbacks, purchaseRows, purchaseTable, seriesKey, cashCredit, purchaseReport, purchaseReturnReport } from "@features/reports/definitions/purchase";
import { defaultFilters } from "@features/reports/framework/filterDefaults";
import { formatAmount } from "@shared/lib/currency";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
});

const fmt: Formatter = { money: (n) => formatAmount(n), number: (n) => String(n) };

const bills = [
  { invoiceDate: "2026-10-23T14:05:00", invoiceNo: "PUR-1", refNo: "R1", supplierName: "Alpha", supplierCode: "S1", employee: "admin", paymode: "Cash", netValue: "0.1", vatAmount: "0.01", billsundry: "0", roundOff: "0", netAmount: "0.11", branchId: 2 },
  { invoiceDate: "2026-10-23T15:10:00", invoiceNo: "PUR-2", refNo: "", supplierName: "Beta", supplierCode: "S2", employee: "admin", paymode: "Credit", netValue: "0.2", vatAmount: "0.02", billsundry: "0.005", roundOff: "-0.005", netAmount: "0.22", branchId: 3 },
  { invoiceDate: "2026-10-24T09:00:00", invoiceNo: "7", refNo: "", supplierName: "alpha", supplierCode: "S1", employee: "", paymode: "Cash", netValue: "1", vatAmount: "0.1", billsundry: "0", roundOff: "0", netAmount: "1.1", branchId: 2 },
];
const masters = {
  suppliers: [{ supplierId: 10, supplierName: "ALPHA", code: "S1" }],
  paymodes: [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Credit" }],
  series: [{ seriesId: 4, seriesName: "Main" }],
};
const all = { branch: "1", series: "0", supplier: "0", paymode: "0", groupBy: "All", from: "2026-10-01", to: "2026-10-31" };

describe("Purchase report", () => {
  it("defaults: Group by All, branch, lookups All, dates 1st of month → today", () => {
    const f = defaultFilters(purchaseReport.filters, new Date(2026, 10, 5), "1");
    expect(f).toEqual({ groupBy: "All", branch: "1", series: "0", supplier: "0", paymode: "0", from: "2026-11-01", to: "2026-11-05" });
    expect(purchaseReturnReport.filters.map((x) => x.key)).toEqual(purchaseReport.filters.map((x) => x.key));
  });

  it("client fallbacks: supplier by name or code, paymode by name; branch only for a real branch", () => {
    expect(applyPurchaseFallbacks(bills, { ...all, supplier: "10" }, masters).map((r) => r.invoiceNo)).toEqual(["PUR-1", "7"]);
    expect(applyPurchaseFallbacks(bills, { ...all, paymode: "2" }, masters).map((r) => r.invoiceNo)).toEqual(["PUR-2"]);
    expect(applyPurchaseFallbacks(bills, all, masters)).toHaveLength(3); // "All" keeps every branch (old bug dropped them)
    expect(applyPurchaseFallbacks(bills, { ...all, branch: "3" }, masters).map((r) => r.invoiceNo)).toEqual(["PUR-2"]);
  });

  it("cells and totals = old page (BillDate dd/MM/yyyy HH:mm, supplier upper-case, exact sums)", () => {
    const m = toMatrix(purchaseTable(bills, all, masters), fmt);
    expect(m.header).toEqual(["S.No", "BILLDATE", "BILLNO", "REF NO", "SUPPLIER", "CODE", "EMPLOYEE", "PAYMODE", "NET VALUE", "VAT AMNT", "BILLSUNDRY", "ROUNDOFF", "AMOUNT"]);
    expect(m.body[0]).toEqual(["1", "23/10/2026 14:05", "PUR-1", "R1", "ALPHA", "S1", "admin", "CASH", "0.100", "0.010", "0.000", "0.000", "0.110"]);
    expect(m.footer?.slice(8)).toEqual(["1.300", "0.130", "0.005", "-0.005", "1.430"]);
    expect(m.totals.netValue).toBe(1.3); // floats: 0.1 + 0.2 + 1 = 1.3000000000000003
  });

  it("Cash / Credit like the old bottom bar", () => {
    expect(cashCredit(bills)).toEqual({ cash: 1.21, credit: 0.22 });
    expect(purchaseTable(bills, all, masters).summary).toEqual([{ label: "Cash", value: 1.21 }, { label: "Credit", value: 0.22 }]);
  });

  it("Group by Supplier / Paymode / Series sums the money columns (exact)", () => {
    const sup = purchaseRows(bills, "Supplier");
    expect(sup.map((r) => [r.supplierName, r.netAmount])).toEqual([["ALPHA", 0.11], ["BETA", 0.22], ["ALPHA", 1.1]]); // old key = exact name (case-sensitive)
    const pay = purchaseRows(bills, "Paymode");
    expect(pay.map((r) => [r.paymode, r.netValue])).toEqual([["CASH", 1.1], ["CREDIT", 0.2]]);
    expect(seriesKey("PUR-12")).toBe("PUR-");
    expect(seriesKey("12")).toBe("Main");
    const ser = purchaseRows(bills, "Series");
    expect(ser.map((r) => [r.invoiceNo, r.netAmount])).toEqual([["PUR-", 0.33], ["Main", 1.1]]);
  });

  it("date-time cell: wall clock read by parts, date-only gets 00:00", () => {
    expect(formatReportDateTime("2026-10-23T23:59:59")).toBe("23/10/2026 23:59");
    expect(formatReportDateTime("2026-10-23")).toBe("23/10/2026 00:00");
    expect(formatReportDateTime("")).toBe("-");
  });
});
