// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPurchaseReport } from "../features/reports/purchaseReport/services/purchaseReportApi";
import { getPurchaseReturnReport } from "../features/reports/purchaseReturnReport/services/purchaseReturnReportApi";
import { purchaseReport, purchaseReturnReport } from "../features/reports/definitions/purchase";

vi.mock("../features/reports/purchaseReturnReport/services/purchaseReturnReportApi", () => ({
  getPurchaseReturnReport: vi.fn(),
  getSeriesList: vi.fn(async () => []),
}));

vi.mock("../features/reports/purchaseReport/services/purchaseReportApi", () => ({
  getPurchaseReport: vi.fn(),
  getPaymodeList: vi.fn(async () => []),
  getSupplierList: vi.fn(async () => []),
  getSeriesList: vi.fn(async () => []),
}));

// The response from Swagger, GET /reports/purchase-report, 2026-11-09.
const bill = (purchaseNo: string, invoiceNo: string, refNo: string, netValue: string, vatAmount: string, netAmount: string) => ({
  purchaseId: Number(purchaseNo), purchaseDate: "2026-11-07T00:00:00", purchaseNo, invoiceDate: "2026-11-07T00:00:00", invoiceNo, refNo,
  supplierCode: "1", supplierName: "Supplier", employee: "Waiter", paymode: "Cash", netValue, vatAmount, roundOff: "0.000", netAmount,
});
const swagger = {
  purchaseData: [bill("3", "112345", "2345", "140.000", "14.000", "160.000"), bill("2", "66", "45", "325.000", "32.500", "400.000"), bill("1", "11", "112", "350.000", "35.000", "389.000")],
  paymodeData: [{ paymodeId: 1, paymodeName: "Cash", amount: 949 }],
  totalData: [{ netValue: 815, vatAmount: 81.5, roundOff: 0, netAmount: 949 }],
};
const filters = { groupBy: "All", branch: "1", series: "0", supplier: "0", paymode: "0", from: "2026-11-01", to: "2026-11-09" };
const sum = (rows: Record<string, unknown>[], key: string) => rows.reduce((total, row) => total + Number(row[key]), 0);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  vi.mocked(getPurchaseReport).mockResolvedValue(swagger as never);
});

describe("Purchase Report against the Swagger response", () => {
  it("sends the same inputs as the Swagger call", async () => {
    await purchaseReport.fetch(filters as never);
    expect(getPurchaseReport).toHaveBeenCalledWith({ BranchId: 1, SeriesId: 0, FromDate: "2026-11-01", ToDate: "2026-11-09", SupplierId: 0, PaymodeId: 0, Decimals: 3 });
  });

  it("shows every bill with its purchase date and number", async () => {
    const table = await purchaseReport.fetch(filters as never);
    expect(table.columns.slice(0, 3).map((c) => c.label)).toEqual(["Purchase Date", "Purchase No", "BillDate"]);
    expect(table.rows.map((r) => [r.purchaseNo, r.invoiceNo, r.refNo])).toEqual([["3", "112345", "2345"], ["2", "66", "45"], ["1", "11", "112"]]);
    expect(table.rows[0].purchaseDate).toBe("2026-11-07T00:00:00");
  });

  it("shows only what the API sends: no Billsundry column", async () => {
    const table = await purchaseReport.fetch(filters as never);
    expect(table.columns.map((c) => c.label)).not.toContain("Billsundry");
    expect(purchaseReport.columns?.map((c) => c.label)).not.toContain("Billsundry");
  });

  it("the footer comes from totalData and paymodeData, and agrees with the rows", async () => {
    const table = await purchaseReport.fetch(filters as never);
    const rows = table.rows as Record<string, unknown>[];
    expect(table.totalsOverride).toEqual({ netValue: 815, vatAmount: 81.5, roundOff: 0, netAmount: 949 });
    expect(table.summary).toEqual([{ label: "Cash", value: 949 }]);
    expect(sum(rows, "netValue")).toBe(815);
    expect(sum(rows, "vatAmount")).toBe(81.5);
    expect(sum(rows, "netAmount")).toBe(949);
  });

  it("lists every paymode the API sends", async () => {
    vi.mocked(getPurchaseReport).mockResolvedValue({ ...swagger, paymodeData: [{ paymodeId: 1, paymodeName: "Cash", amount: 900 }, { paymodeId: 2, paymodeName: "Card", amount: 49 }] } as never);
    expect((await purchaseReport.fetch(filters as never)).summary).toEqual([{ label: "Cash", value: 900 }, { label: "Card", value: 49 }]);
  });

  it("group rows leave the purchase date and number blank", async () => {
    const table = await purchaseReport.fetch({ ...filters, groupBy: "Supplier" } as never);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]).toMatchObject({ purchaseDate: "", purchaseNo: "", netAmount: 949 });
    expect(table.totalsOverride).toBeUndefined();
  });

});

describe("Purchase Return Report against the Swagger response", () => {
  const ret = (no: string, invoiceNo: string, refNo: string, netValue: string, vatAmount: string, roundOff: string, netAmount: string) => ({
    purchaseReturnId: Number(no), purchaseReturnDate: "2026-11-07T00:00:00", purchaseReturnNo: no, invoiceNo, refNo,
    supplierCode: "1", supplierName: "Supplier", employee: "Waiter", paymode: "Cash", netValue, vatAmount, roundOff, netAmount,
  });
  const returns = {
    purchaseReturnData: [ret("4", "", "7731", "12.000", "1.200", "6.800", "20.000"), ret("3", "", "1123", "240.000", "24.000", "50.000", "314.000"), ret("2", "11", "112", "350.000", "35.000", "35.000", "405.000"), ret("1", "", "2211", "12.000", "1.200", "1.200", "20.200")],
    paymodeData: [{ paymodeId: 1, paymodeName: "Cash", amount: 759.2 }],
    totalData: [{ netValue: 614, vatAmount: 61.4, roundOff: 93, netAmount: 759.2 }],
  };

  beforeEach(() => vi.mocked(getPurchaseReturnReport).mockResolvedValue(returns as never));

  it("sends the same inputs as the Swagger call", async () => {
    await purchaseReturnReport.fetch(filters as never);
    expect(getPurchaseReturnReport).toHaveBeenCalledWith({ BranchId: 1, SeriesId: 0, FromDate: "2026-11-01", ToDate: "2026-11-09", SupplierId: 0, PaymodeId: 0, Decimals: 3 });
  });

  it("shows the columns the API sends: Return No yes, Billsundry and Purchase No no", async () => {
    const labels = (await purchaseReturnReport.fetch(filters as never)).columns.map((c) => c.label);
    expect(labels).toEqual(["BillDate", "Return No", "BillNo", "Ref No", "Supplier", "Code", "Employee", "Paymode", "Net Value", "Vat Amnt", "RoundOff", "Amount"]);
    expect(purchaseReturnReport.columns?.map((c) => c.label)).toEqual(labels);
  });

  it("every return appears, dated by purchaseReturnDate, with a blank bill number where the API has none", async () => {
    const { rows } = await purchaseReturnReport.fetch(filters as never);
    expect(rows.map((r) => [r.purchaseReturnNo, r.invoiceNo, r.refNo])).toEqual([["4", "", "7731"], ["3", "", "1123"], ["2", "11", "112"], ["1", "", "2211"]]);
    expect(rows.every((r) => r.invoiceDate === "2026-11-07T00:00:00")).toBe(true);
  });

  it("the footer comes from totalData and paymodeData, and agrees with the rows", async () => {
    const table = await purchaseReturnReport.fetch(filters as never);
    const rows = table.rows as Record<string, unknown>[];
    expect(table.totalsOverride).toEqual({ netValue: 614, vatAmount: 61.4, roundOff: 93, netAmount: 759.2 });
    expect(table.summary).toEqual([{ label: "Cash", value: 759.2 }]);
    expect(sum(rows, "netValue")).toBeCloseTo(614, 6);
    expect(sum(rows, "vatAmount")).toBeCloseTo(61.4, 6);
    expect(sum(rows, "roundOff")).toBeCloseTo(93, 6);
    expect(sum(rows, "netAmount")).toBeCloseTo(759.2, 6);
  });
});
