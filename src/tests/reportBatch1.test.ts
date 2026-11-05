/**
 * Phase 4, batch 1 — Category / Group / Employee / Menu Session on the report framework,
 * compared with the old pages' logic (cells and totals to the fil).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { toMatrix, computeTotals, type Formatter } from "@features/reports/framework/reportMath";
import { categoryTable, categoryMaster, resolveCategoryName, groupTable, employeeTable, totalsFromBackend } from "@features/reports/definitions/itemSales";
import { periodTable } from "@features/reports/definitions/salesByPeriod";
import { formatAmount } from "@shared/lib/currency";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
});

const fmt: Formatter = { money: (n) => formatAmount(n), number: (n) => String(n) };
type Row = Record<string, unknown>;

describe("Category wise sales", () => {
  const master = categoryMaster([{ catId: 5, catCode: "BEV", catName: "Beverages" }, { catId: 7, catCode: "FD", catName: "Food" }]);

  it("name resolution follows the old hook (own name → master by id / code → selected → Uncategorized)", () => {
    expect(resolveCategoryName({ catgeory: "Hot Drinks" }, master, "0", 2)).toBe("Hot Drinks");
    expect(resolveCategoryName({ categoryId: 7 }, master, "0", 2)).toBe("Food");
    expect(resolveCategoryName({ catCode: "bev" }, master, "0", 2)).toBe("Beverages");
    expect(resolveCategoryName({ code: "5" }, master, "0", 2)).toBe("Beverages"); // numeric code = id
    expect(resolveCategoryName({}, master, "7", 1)).toBe("Food"); // single row + selected category
    expect(resolveCategoryName({ name: "null" }, master, "0", 2)).toBe("Uncategorized");
  });

  it("cells and totals = old page (money totals from totalData when sent, Qty = sum)", () => {
    const data = {
      categoryData: [
        { catId: 5, qty: "3", amount: "10.105", discount: "0.1", netValue: "10.005", vatAmount: "1.0005", netAmount: "11.0055" },
        { catId: 7, quantity: 2, amount: "0.2", discount: "0", netValue: "0.2", vatAmount: "0.02", netAmount: "0.22" },
      ],
      totalData: { amount: "10.305", discount: "0.1", netValue: "10.205", vatAmount: "1.0205", netAmount: "11.2255" },
    };
    const m = toMatrix(categoryTable(data, master, "0"), fmt);
    expect(m.header).toEqual(["S.No", "CATEGORY", "QTY", "AMOUNT", "DISCOUNT", "NET VALUE", "VAT AMOUNT", "NET AMOUNT"]);
    expect(m.body[0]).toEqual(["1", "Beverages", "3", "10.105", "0.100", "10.005", "1.001", "11.006"]);
    expect(m.body[1]).toEqual(["2", "Food", "2", "0.200", "0.000", "0.200", "0.020", "0.220"]);
    expect(m.footer).toEqual(["", "TOTAL", "5", "10.305", "0.100", "10.205", "1.021", "11.226"]);
  });

  it("totalData may be an array; missing fields fall back to the sum", () => {
    expect(totalsFromBackend([{ amount: "5" }])).toEqual({ amount: 5 });
    const t = categoryTable({ categoryData: [{ catId: 5, amount: "1", discount: "0.5" }], totalData: [{ amount: "9" }] }, master, "0");
    expect(computeTotals(t)).toMatchObject({ amount: 9, discount: 0.5 });
  });
});

describe("Group wise sales", () => {
  it("code / name fallbacks and totals like the old page", () => {
    const data = { groupData: [{ grpId: 3, name: "Kitchen", qty: 1, amount: "4", discount: "0", netValue: "4", vatAmount: "0.4", netAmount: "4.4" }], totalData: null };
    const m = toMatrix(groupTable(data), fmt);
    expect(m.body[0]).toEqual(["1", "3", "Kitchen", "1", "4.000", "0.000", "4.000", "0.400", "4.400"]);
    expect(m.footer?.slice(3)).toEqual(["1", "4.000", "0.000", "4.000", "0.400", "4.400"]);
    expect(toMatrix(groupTable({ groupData: [{}] }), fmt).body[0].slice(1, 3)).toEqual(["-", "-"]);
  });
});

describe("Employee sales", () => {
  it("code, upper-case name, exact totals", () => {
    const rows = [{ code: "E1", employee: "ali", netValue: "0.1", vatAmount: "0.01", netAmount: "0.11" }, { code: "E2", employee: "Sara", netValue: "0.2", vatAmount: "0.02", netAmount: "0.22" }];
    const m = toMatrix(employeeTable(rows), fmt);
    expect(m.body.map((r: string[]) => r[2])).toEqual(["ALI", "SARA"]);
    expect(m.footer).toEqual(["", "TOTAL", "", "0.300", "0.030", "0.330"]);
    expect(0.1 + 0.2).not.toBe(0.3);
  });
});

describe("Menu session sales", () => {
  it("keeps a backend row Total, computes it when missing; VoucherDate → Date (dd/MM/yyyy)", () => {
    const api = { columns: ["Date", "Breakfast", "Lunch"], rows: [
      { VoucherDate: "2026-11-05", Breakfast: "1.1", Lunch: "2.2" } as Row,
      { VoucherDate: "2026-11-06", Breakfast: "1", Lunch: "1", Total: "2.5" } as Row,
    ] };
    const t = periodTable(api, { textKeys: ["Date", "VoucherDate"], dateKeys: ["Date", "VoucherDate"], labels: { VoucherDate: "Date" }, rowTotal: "computeIfMissing", copyField: { from: "VoucherDate", to: "Date" } });
    const m = toMatrix(t, fmt);
    expect(m.header).toEqual(["S.No", "DATE", "BREAKFAST", "LUNCH", "TOTAL"]);
    expect(m.body[0]).toEqual(["1", "05/11/2026", "1.100", "2.200", "3.300"]);
    expect(m.body[1]).toEqual(["2", "06/11/2026", "1.000", "1.000", "2.500"]); // backend Total kept (old behaviour)
  });
});
