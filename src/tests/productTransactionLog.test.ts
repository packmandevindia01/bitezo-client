/**
 * Product Transaction Log report (back office → Reports → Inventory).
 * A new product with only an opening stock must not show as "no data".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const get = vi.fn();
vi.mock("../api/axiosInstance", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { getProductTransactionLogReport } from "../features/reports/productTransactionLogReport/services/productTransactionLogReportApi";
import {
  normalizeTransactionLog, hasQty, localDateString, firstOfMonthLocal,
} from "../features/reports/productTransactionLogReport/utils/normalizeTransactionLog";
import { ALL_BRANCH_ID, isAllBranch, toReportBranchId } from "../hooks/useBranchScope";

const params = { BranchId: 1, ProductId: 55, FromDate: "2026-11-01", ToDate: "2026-11-04" };

beforeEach(() => get.mockReset());

describe("request", () => {
  it("calls GET /reports/product-transaction-log with BranchId / ProductId / FromDate / ToDate", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: { logData: [], totalData: null } } });
    await getProductTransactionLogReport(params);
    expect(get).toHaveBeenCalledWith("/reports/product-transaction-log", { params });
  });
});

describe("response shapes", () => {
  const row = { sNo: 1, branch: "Main", date: "2026-11-04T10:00:00", transaction: "Opening Stock", voucherNo: "OP-1",
    account: "", qtyIn: "10.000", qtyOut: "", balance: "10.000" };
  const totals = { opening: "0.000", received: "10.000", issued: "0.000", balance: "10.000" };

  it("wrapped { isSuccess, data }", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, message: null, data: { logData: [row], totalData: totals } } });
    const r = await getProductTransactionLogReport(params);
    expect(r.logData).toHaveLength(1);
    expect(r.logData[0].transaction).toBe("Opening Stock");
    expect(r.totalData.balance).toBe("10.000");
  });

  it("not wrapped", () => {
    const r = normalizeTransactionLog({ logData: [row], totalData: totals })!;
    expect(r.logData[0].qtyIn).toBe("10.000");
  });

  it("PascalCase keys and numbers", () => {
    const r = normalizeTransactionLog({ Data: { LogData: [{ SNo: 1, Branch: "Main", TransDate: "2026-11-04", Transaction: "Opening Stock",
      VoucherNo: "OP-1", QtyIn: 10, QtyOut: 0, Balance: 10 }], TotalData: { Opening: 0, Received: 10, Issued: 0, Balance: 10 } } })!;
    expect(r.logData[0]).toMatchObject({ branch: "Main", date: "2026-11-04", qtyIn: "10", balance: "10" });
    expect(r.totalData).toEqual({ opening: "0", received: "10", issued: "0", balance: "10" });
  });

  it("null lists / empty body → empty report, no crash", async () => {
    get.mockResolvedValue({ data: { isSuccess: true, data: { logData: null, totalData: null } } });
    const r = await getProductTransactionLogReport(params);
    expect(r.logData).toEqual([]);
    expect(r.totalData.opening).toBe("-");
    get.mockResolvedValue({ data: null });
    expect((await getProductTransactionLogReport(params)).logData).toEqual([]);
  });
});

describe("opening stock only (no movements in the period)", () => {
  it("totals are detected so the page shows Opening / Closing instead of 'no data'", () => {
    const r = normalizeTransactionLog({ data: { logData: [], totalData: { opening: "10.000", received: "0.000", issued: "0.000", balance: "10.000" } } })!;
    expect(r.logData).toHaveLength(0);
    expect(Object.values(r.totalData).some(hasQty)).toBe(true);
  });

  it("totals with units (real backend: product 1123, 01-11 → 04-11, no movements)", () => {
    const r = normalizeTransactionLog({ isSuccess: true, data: { logData: [],
      totalData: { opening: "0 Kg 100 Gm", received: "0 Kg", issued: "0 Kg 0 Gm", balance: "0 Kg 100 Gm" } } })!;
    expect(Object.values(r.totalData).some(hasQty)).toBe(true);
    expect(hasQty("0 Kg 100 Gm")).toBe(true);
    expect(hasQty("3 Nos")).toBe(true);
    expect(hasQty("0 Kg 0 Gm")).toBe(false);
    expect(hasQty("0 Kg")).toBe(false);
  });

  it("all-zero totals are treated as empty", () => {
    expect(["0.000", "-", "", "0"].some(hasQty)).toBe(false);
    expect(hasQty("1,250.000")).toBe(true);
  });
});

describe("default dates use the local day (not UTC)", () => {
  afterEach(() => vi.useRealTimers());

  it("local date string and first of month", () => {
    const d = new Date(2026, 10, 4, 1, 30); // 4 Nov 2026 01:30 local
    expect(localDateString(d)).toBe("2026-11-04");
    expect(firstOfMonthLocal(d)).toBe("2026-11-01");
  });
});


describe("branch ids (backend: 1 = All, 2 = Main)", () => {
  it("report BranchId: All = 1, Main = 2, a cleared box sends 1 (never 0)", () => {
    expect(ALL_BRANCH_ID).toBe(1);
    expect(toReportBranchId("1")).toBe(1);
    expect(toReportBranchId("2")).toBe(2);
    expect(toReportBranchId("")).toBe(1);
    expect(toReportBranchId(null)).toBe(1);
    expect(toReportBranchId("0")).toBe(1);
    expect(toReportBranchId("abc")).toBe(1);
  });

  it("'All' is recognised by id 1 or by name; Main (2) is a real branch", () => {
    expect(isAllBranch({ id: 1, name: "Anything" })).toBe(true);
    expect(isAllBranch({ branchId: 1, branchName: "All" })).toBe(true);
    expect(isAllBranch({ id: 99, name: " ALL " })).toBe(true);
    expect(isAllBranch({ id: 2, name: "Main" })).toBe(false);
    expect(isAllBranch(null)).toBe(false);
  });
});
