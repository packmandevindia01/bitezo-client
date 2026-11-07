import { assertReportSuccess } from "@features/reports/framework/reportResponse";
/**
 * Phase 4 — report framework: pure maths + the Monthly Sales pilot compared with the old page logic.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { computeTotals, dynamicColumns, withRowTotal, toMatrix, formatCell, cellNumber, type Formatter } from "@features/reports/framework/reportMath";
import { defaultFilters, parseMonth } from "@features/reports/framework/filterDefaults";
import { reportErrorMessage } from "@features/reports/framework/useReport";
import { monthlySalesTable, monthlySalesParams } from "@features/reports/definitions/monthlySales";
import { formatAmount } from "@shared/lib/currency";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("currencySymbol", "BHD");
});

const fmt: Formatter = { money: (n) => formatAmount(n), number: (n) => String(n) };

describe("report maths", () => {
  it("exact totals (no float noise)", () => {
    const t = computeTotals({ columns: dynamicColumns(["Name", "A"], ["Name"]), rows: [{ A: 0.1 }, { A: 0.2 }, { A: "1,000.005" }] });
    expect(t.A).toBe(1000.305);
    expect(0.1 + 0.2).not.toBe(0.3); // what the old pages summed
  });

  it("cellNumber accepts strings with thousands separators; junk → 0", () => {
    expect(cellNumber("1,234.500")).toBe(1234.5);
    expect(cellNumber("abc")).toBe(0);
    expect(cellNumber(null)).toBe(0);
  });

  it("withRowTotal adds an exact per-row total once", () => {
    const t = withRowTotal({ columns: dynamicColumns(["Month", "Cash", "Card"], ["Month"]), rows: [{ Month: "Jan", Cash: "0.1", Card: "0.2" }] }, "Total", ["Cash", "Card"]);
    expect(t.rows[0].Total).toBe(0.3);
    expect(withRowTotal(t).columns.filter((c) => c.key === "Total")).toHaveLength(1);
  });

  it("matrix = what screen / print / Excel / PDF show (header, S.No, totals row)", () => {
    const m = toMatrix({ columns: dynamicColumns(["Month", "Cash"], ["Month"]), rows: [{ Month: "Jan", Cash: 1.5 }, { Month: "", Cash: 2 }] }, fmt);
    expect(m.header).toEqual(["S.No", "MONTH", "CASH"]);
    expect(m.body).toEqual([["1", "Jan", "1.500"], ["2", "-", "2.000"]]);
    expect(m.footer).toEqual(["", "TOTAL", "3.500"]);
    expect(m.align).toEqual(["center", "left", "right"]);
    expect(toMatrix({ columns: [], rows: [] }, fmt).footer).toBeNull();
  });

  it("formatCell: money / number / text", () => {
    expect(formatCell({ key: "a", label: "a", kind: "money" }, "2", fmt)).toBe("2.000");
    expect(formatCell({ key: "a", label: "a", kind: "qty" }, 3, fmt)).toBe("3");
    expect(formatCell({ key: "a", label: "a", kind: "text" }, "  ", fmt)).toBe("-");
  });
});

describe("filter defaults (local calendar)", () => {
  it("dates / months / branch", () => {
    const now = new Date(2026, 10, 5, 0, 30); // 00:30 local — UTC would still be 4 Nov in GCC
    const f = defaultFilters([
      { kind: "branch", key: "b" },
      { kind: "date", key: "from", label: "From", default: "firstOfMonth" },
      { kind: "date", key: "to", label: "To", default: "today" },
      { kind: "month", key: "m1", label: "M1", default: "januaryThisYear" },
      { kind: "month", key: "m2", label: "M2", default: "thisMonth" },
    ], now, "");
    expect(f).toEqual({ b: "1", from: "2026-11-01", to: "2026-11-05", m1: "2026-01", m2: "2026-11" });
    expect(parseMonth("2026-13", { year: 2000, month: 4 })).toEqual({ year: 2026, month: 4 });
  });
});

describe("report errors are readable", () => {
  it("403 / 401 / network", () => {
    expect(reportErrorMessage({ response: { status: 403, data: { message: "Forbidden" } } })).toContain("No permission");
    expect(reportErrorMessage({ response: { status: 401 } })).toContain("Session expired");
    expect(reportErrorMessage({ message: "Network Error" })).toBe("Could not load the report: Network Error");
  });
});

describe("Monthly Sales pilot = old page logic", () => {
  const api = {
    columns: ["Month", "DineIn", "TakeOut", "Delivery"],
    rows: [
      { Month: "January", DineIn: "120.105", TakeOut: "80.2", Delivery: "0.1" },
      { Month: "February", DineIn: "0.2", TakeOut: "15.335", Delivery: "33.333" },
      { Month: "March", DineIn: "0", TakeOut: "", Delivery: "1000.555" },
    ],
  };

  // The old page: select() added Total = float Σ (String), footer totals = float Σ, cells formatAmount(Number(x)||0).
  type Row = Record<string, string>;
  const oldTable = () => {
    const columns = [...api.columns, "Total"];
    const rows: Row[] = api.rows.map((r: Row) => ({ ...r, Total: String(api.columns.reduce((s, c) => (c !== "Month" ? s + (Number(r[c]) || 0) : s), 0)) }));
    const totals: Record<string, number> = {};
    columns.forEach((c) => { if (c !== "Month") totals[c] = rows.reduce((s: number, r: Row) => s + (Number(r[c]) || 0), 0); });
    const body = rows.map((r: Row, i: number) => [String(i + 1), ...columns.map((c) => (c === "Month" ? r[c] || "-" : formatAmount(Number(r[c]) || 0)))]);
    const footer = ["", "TOTAL", ...columns.filter((c) => c !== "Month").map((c) => formatAmount(totals[c] || 0))];
    return { header: ["S.No", ...columns.map((c) => c.toUpperCase())], body, footer };
  };

  it("same header, rows and totals row as the old page (to the fil)", () => {
    const m = toMatrix(monthlySalesTable(api), fmt);
    const old = oldTable();
    expect(m.header).toEqual(old.header);
    expect(m.body).toEqual(old.body);
    expect(m.footer).toEqual(old.footer);
  });

  it("keeps a backend-provided Total column (no duplicate)", () => {
    const t = monthlySalesTable({ columns: ["Month", "Cash", "Total"], rows: [{ Month: "Jan", Cash: "5", Total: "5" }] });
    expect(t.columns.map((c) => c.key)).toEqual(["Month", "Cash", "Total"]);
  });

  it("empty response → empty table", () => {
    expect(monthlySalesTable(null)).toEqual({ columns: [], rows: [] });
  });

  it("params: same as before, but BranchId is never 0", () => {
    expect(monthlySalesParams({ branch: "3", from: "2026-01", to: "2026-06" })).toEqual({ BranchId: 3, FromMonth: 1, FromYear: 2026, ToMonth: 6, ToYear: 2026, Decimals: 3 });
    expect(monthlySalesParams({ branch: "", from: "2026-01", to: "2026-12" }).BranchId).toBe(1); // old page sent 0
  });
});

import { periodTable, dateRangeParams } from "@features/reports/definitions/salesByPeriod";

describe("Daily / Hourly / Order-Type on the framework = old pages (money cells + totals to the fil)", () => {
  const moneyCells = (m: ReturnType<typeof toMatrix>) => m.body.map((r) => r.slice(2)); // drop S.No + date/time
  const oldRowTotal = (row: Record<string, string>, cols: string[], textKey: string) =>
    cols.reduce((s, c) => (c !== textKey ? s + (Number(row[c]) || 0) : s), 0);

  it("Daily: Total = Σ paymodes per row; VoucherDate shown dd/MM/yyyy under 'Date'", () => {
    const api = { columns: ["VoucherDate", "Cash", "Card"], rows: [{ VoucherDate: "2026-11-01T00:00:00", Cash: "10.105", Card: "0.1" }, { VoucherDate: "2026-11-02", Cash: "0.2", Card: "5" }] };
    const t = periodTable(api, { textKeys: ["VoucherDate"], dateKeys: ["VoucherDate"], labels: { VoucherDate: "Date" }, rowTotal: "compute" });
    const m = toMatrix(t, fmt);
    expect(m.header).toEqual(["S.No", "DATE", "CASH", "CARD", "TOTAL"]);
    expect(m.body.map((r) => r[1])).toEqual(["01/11/2026", "02/11/2026"]);
    const oldRows = api.rows.map((r) => [formatAmount(Number(r.Cash)), formatAmount(Number(r.Card)), formatAmount(oldRowTotal(r, api.columns, "VoucherDate"))]);
    expect(moneyCells(m)).toEqual(oldRows);
    expect(m.footer).toEqual(["", "TOTAL", "10.305", "5.100", "15.405"]);
  });

  it("Hourly: rows already carry Total → only the column is added (values untouched)", () => {
    const api = { columns: ["Time", "Cash"], rows: [{ Time: "10:00 - 11:00", Cash: "3", Total: "3" }] };
    const t = periodTable(api, { textKeys: ["Time"], rowTotal: "columnOnly" });
    expect(t.columns.map((c) => c.key)).toEqual(["Time", "Cash", "Total"]);
    expect(t.rows[0].Total).toBe("3");
    expect(toMatrix(t, fmt).body[0]).toEqual(["1", "10:00 - 11:00", "3.000", "3.000"]);
  });

  it("Order-Type: VoucherDate copied to Date; a backend Total column is not double-counted", () => {
    const api = { columns: ["Date", "DineIn", "TakeOut"], rows: [{ VoucherDate: "2026-11-05", DineIn: "1.1", TakeOut: "2.2" }] };
    const t = periodTable(api, { textKeys: ["Date", "VoucherDate"], dateKeys: ["Date", "VoucherDate"], labels: { VoucherDate: "Date" }, rowTotal: "compute", copyField: { from: "VoucherDate", to: "Date" } });
    expect(toMatrix(t, fmt).body[0]).toEqual(["1", "05/11/2026", "1.100", "2.200", "3.300"]);
    const withTotal = periodTable({ columns: ["Date", "DineIn", "Total"], rows: [{ Date: "2026-11-05", DineIn: "4", Total: "4" }] }, { textKeys: ["Date"], rowTotal: "compute" });
    expect(withTotal.rows[0].Total).toBe("4"); // old code summed DineIn + Total = 8
  });

  it("date-range params: BranchId never 0 (Order-Type defaulted to 0)", () => {
    expect(dateRangeParams({ branch: "0", from: "2026-11-01", to: "2026-11-05" })).toEqual({ BranchId: 1, FromDate: "2026-11-01", ToDate: "2026-11-05", Decimals: 3 });
    expect(dateRangeParams({ branch: "4", from: "a", to: "b" }).BranchId).toBe(4);
  });
});

describe("assertReportSuccess", () => {
  it("HTTP 200 with isSuccess false is an error, with the backend's reason", () => {
    expect(() => assertReportSuccess({ isSuccess: false, message: "Validation failed.", errors: [{ message: "Branch ID is required." }] })).toThrow("Branch ID is required.");
    expect(() => assertReportSuccess({ isSuccess: false, message: "Operation failed" })).toThrow("Operation failed");
  });
  it("a successful or plain response passes", () => {
    expect(() => assertReportSuccess({ isSuccess: true, data: [] })).not.toThrow();
    expect(() => assertReportSuccess([])).not.toThrow();
    expect(() => assertReportSuccess(null)).not.toThrow();
  });
});
