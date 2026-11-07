/**
 * Phase 4, last 21 reports on the framework, checked against the old pages' logic: client fallbacks,
 * Group by, totals (backend totalData or the exact sum), field fallbacks and the new framework parts.
 * Row shapes are taken from the old pages' types; live API responses still need checking in the real app.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { BLANK_CELL, computeTotals, formatCell, rowSerials, toMatrix, type Formatter } from "@features/reports/framework/reportMath";
import { applyReportSearch } from "@features/reports/framework/useReport";
import { productWiseRows, productWiseTable, productWiseFallbacks, purchaseReturnReport } from "@features/reports/definitions/purchase";
import { applyStockRegisterFallbacks, stockRegisterReport, stockRegisterRows, STOCK_REGISTER_COLUMNS, productWiseStockTransferReport, PW_STOCK_ADJUSTMENT_COLUMNS, PW_STOCK_TRANSFER_COLUMNS } from "@features/reports/definitions/stock";
import { applySalesFallbacks, salesRows, salesTable, marginTotals, allTransactionTable, SALES_COLUMNS, BILL_MARGIN_COLUMNS } from "@features/reports/definitions/sales";
import { vatTable, vatPercent, billLevyTable, productLevyTable } from "@features/reports/definitions/vatLevy";
import { balanceTable, customerStatementReport, STATEMENT_COLUMNS } from "@features/reports/definitions/accounts";
import { closingCell, closingColumnNames, closingTable, withCashFlow, logTable, productTransactionLogReport } from "@features/reports/definitions/closing";
import { formatAmount } from "@shared/lib/currency";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
});

const fmt: Formatter = { money: (n) => formatAmount(n), number: (n) => String(n) };
const noMasters = { suppliers: [], products: [] };

describe("Product Wise Purchase", () => {
  const rows = [
    { "p/R Number": "1", invoiceDate: "2026-11-01T10:30:00", invoiceNo: "A1", supplierName: "Alpha", productCode: "P1", productnName: "Rice", qty: 0.1, unit: "Nos", price: "2.000", discount: "0.100", netValue: "0.200", vatAmount: "0.020", netAmount: "0.220" },
    { "p/R Number": "2", invoiceDate: "2026-11-02T00:00:00", invoiceNo: "A2", supplierName: "Beta", productCode: "P1", productnName: "Rice", qty: 0.2, unit: "Nos", price: "3.000", discount: "0.200", netValue: "0.100", vatAmount: "0.010", netAmount: "0.110" },
  ];

  it("reads the API's own field names (`p/R Number`, `productnName`)", () => {
    const [r] = productWiseRows(rows, "All");
    expect(r).toMatchObject({ prNumber: "1", productName: "RICE", supplierName: "ALPHA", price: "2.000" });
  });

  it("Group by Product sums exactly, with no float noise and a blank Price", () => {
    const grouped = productWiseRows(rows, "Product");
    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({ qty: 0.3, discount: 0.3, netAmount: 0.33, price: BLANK_CELL });
    const m = toMatrix(productWiseTable({ purchaseData: rows }, { groupBy: "Product" }, noMasters), fmt);
    expect(m.body[0][m.header.indexOf("PRICE")]).toBe("");
  });

  it("backend totals win only on the ungrouped list; Qty is always the sum", () => {
    const totalData = { discount: "9.000", netValue: "9.000", vatAmount: "9.000", netAmount: "9.000" };
    expect(computeTotals(productWiseTable({ purchaseData: rows, totalData }, { groupBy: "All" }, noMasters))).toMatchObject({ qty: 0.3, netAmount: 9 });
    expect(computeTotals(productWiseTable({ purchaseData: rows, totalData }, { groupBy: "Supplier" }, noMasters)).netAmount).toBe(0.33);
  });

  it("supplier fallback matches by name", () => {
    const suppliers = [{ supplierId: 7, supplierName: "beta" }];
    expect(productWiseFallbacks(rows, { supplier: "7", product: "0" }, { suppliers, products: [] })).toHaveLength(1);
  });
});

describe("Stock Register", () => {
  const rows = [
    { productId: 1, productCode: "P1", productName: "Rice", group: "Food", category: "Dry", stock: "5 Nos", cost: "2", value: "0.1" },
    { productId: 2, productCode: "P2", productName: "Oil", group: "Food", category: "Wet", stock: "1 Nos", cost: "3", value: "0.2" },
    { productId: 3, productCode: "P3", productName: "Soap", group: "Home", category: "", stock: "1 Nos", cost: "3", value: "1" },
  ];

  it("only Value is totalled, exactly", () => {
    const t = computeTotals({ columns: STOCK_REGISTER_COLUMNS, rows });
    expect(t).toEqual({ value: 1.3 });
  });

  it("Group by Group / Category", () => {
    expect(stockRegisterRows(rows, "Group").map((r) => [r.group, r.value])).toEqual([["Food", 0.3], ["Home", 1]]);
    expect(stockRegisterRows(rows, "Category").map((r) => r.category)).toEqual(["Dry", "Wet", "Unknown Category"]);
  });

  it("fallback filters by the selected master's name", () => {
    const m = { groups: [{ id: 4, name: "home" }], categories: [], products: [] };
    expect(applyStockRegisterFallbacks(rows, { group: "4" }, m).map((r) => r.productCode)).toEqual(["P3"]);
  });

  it("a product row links to its log; a grouped row has no link", () => {
    expect(stockRegisterReport.rowLink?.(rows[0])).toBe("/dashboard/reports/product-transaction-log?product=1&productName=Rice");
    expect(stockRegisterReport.rowLink?.(stockRegisterRows(rows, "Group")[0])).toBeNull();
  });
});

describe("Stock Adjustment and Transfer", () => {
  it("Qty and Net Amount are totalled, Price is not", () => {
    const rows = [{ qty: 0.1, price: "5", netAmount: "0.1" }, { qty: 0.2, price: "5", netAmount: "0.2" }];
    expect(computeTotals({ columns: PW_STOCK_ADJUSTMENT_COLUMNS, rows })).toEqual({ qty: 0.3, netAmount: 0.3 });
    expect(computeTotals({ columns: PW_STOCK_TRANSFER_COLUMNS, rows })).toEqual({ qty: 0.3, netAmount: 0.3 });
  });

  it("search is client side and drops backend totals while it is active", () => {
    const match = productWiseStockTransferReport.search!.match;
    const table = { columns: PW_STOCK_TRANSFER_COLUMNS, rows: [{ product: "Rice", netAmount: 1 }, { product: "Oil", netAmount: 2 }], totalsOverride: { netAmount: 99 } };
    const found = applyReportSearch(table, " RICE ", match);
    expect(found.rows).toHaveLength(1);
    expect(computeTotals(found).netAmount).toBe(1);
    expect(applyReportSearch(table, "", match)).toBe(table);
  });
});

describe("Sales", () => {
  const rows = [
    { invoiceNo: "SA-1", invoiceDate: "2026-11-01", customerName: "Ann", customerCode: "C1", paymode: "Cash", netValue: "0.1", vatAmount: "0.01", netAmount: "0.11", branchId: 2 },
    { invoiceNo: "SA-2", invoiceDate: "2026-11-01", customerName: "Ann", customerCode: "C1", paymode: "Credit Card", netValue: "0.2", vatAmount: "0.02", netAmount: "0.22", branchId: 3 },
  ];
  const masters = { customers: [], paymodes: [], series: [] };

  it("\"All\" keeps every branch; a real branch filters", () => {
    expect(applySalesFallbacks(rows, { branch: "1" }, masters)).toHaveLength(2);
    expect(applySalesFallbacks(rows, { branch: "3" }, masters).map((r) => r.invoiceNo)).toEqual(["SA-2"]);
  });

  it("Group by Customer / Paymode / Series, with exact sums", () => {
    expect(salesRows(rows, "Customer")[0]).toMatchObject({ customerName: "Ann", customerCode: "C1", netAmount: 0.33 });
    expect(salesRows(rows, "Paymode").map((r) => r.paymode)).toEqual(["Cash", "Credit Card"]);
    expect(salesRows(rows, "Series")).toHaveLength(1);
    expect(salesRows(rows, "Series")[0].invoiceNo).toBe("SA-");
  });

  it("Bill Date is formatted, and Cash / Credit match the old page", () => {
    const t = salesTable(rows, { groupBy: "All" }, masters);
    expect(t.rows[0].billDate).toBe("01/11/2026");
    expect(t.summary).toEqual([{ label: "Cash", value: 0.11 }, { label: "Credit", value: 0.22 }]);
    expect(t.columns).toBe(SALES_COLUMNS);
  });
});

describe("Margin", () => {
  it("Margin % comes from the backend and is never summed", () => {
    const table = { columns: BILL_MARGIN_COLUMNS, rows: [{ netValue: 1, cost: 1, margin: 1, marginper: 40 }, { netValue: 1, cost: 1, margin: 1, marginper: 60 }] };
    expect(computeTotals({ ...table, totalsOverride: marginTotals([{ netValue: 5, cost: 3, margin: 2, marginper: 40 }], "marginper") })).toEqual({ netValue: 5, cost: 3, margin: 2, marginper: 40 });
    expect(computeTotals({ ...table, totalsOverride: marginTotals(null, "marginper") })).toEqual({ netValue: 2, cost: 2, margin: 2, marginper: 0 });
  });
});

describe("All Transaction", () => {
  const rows = [
    { voucher: "Opening Balance", particular: "Opening", amount: "5" },
    { voucher: "Sales", particular: "Cash", amount: "0.1" },
    { voucher: "Purchase", particular: "Cash", amount: "0.5" },
    { voucher: "Sales", particular: "Card", amount: "0.2" },
    { voucher: "Closing Balance", particular: "Closing", amount: "7" },
  ];

  it("vouchers keep their order, balances go last, each with a subtotal", () => {
    const t = allTransactionTable(rows);
    expect(t.rows.map((r) => [r.particular, r.amount])).toEqual([
      ["Cash", 0.1], ["Card", 0.2], ["Total Sales", 0.3],
      ["Cash", 0.5], ["Total Purchase", 0.5],
      ["Opening", 5], ["Closing", 7], ["Total Balance", 12],
    ]);
  });

  it("no grand total across vouchers, and subtotals get no S.No", () => {
    const t = allTransactionTable(rows);
    expect(computeTotals(t)).toEqual({});
    expect(toMatrix(t, fmt).footer).toBeNull();
    expect(rowSerials(t.rows)).toEqual(["1", "2", "", "3", "", "4", "5", ""]);
    expect(toMatrix(t, fmt).body[2][0]).toBe("");
  });
});

describe("VAT and levy", () => {
  it("VAT reads outPutData or the input report's keys, with field fallbacks", () => {
    const row = { product: "Rice", code: "P1", vatPer: "10", value: "1", vatAmount: "0.1", netAmount: "1.1" };
    expect(vatTable({ outPutData: [row] }).rows[0]).toMatchObject({ productCode: "P1", productName: "Rice", vatPercent: "10%" });
    expect(vatTable({ inPutData: [row] }).rows).toHaveLength(1);
    expect(vatTable([row]).rows).toHaveLength(1);
    expect(vatPercent({})).toBe("-");
    expect(vatPercent({ vatPer: "5%" })).toBe("5%");
  });

  it("totals = backend when sent, otherwise the sum", () => {
    const rows = [{ value: "0.1", vatAmount: "0.1", netAmount: "0.2" }, { value: "0.2", vatAmount: "0.1", netAmount: "0.3" }];
    expect(computeTotals(vatTable({ outPutData: rows })).value).toBe(0.3);
    expect(computeTotals(vatTable({ outPutData: rows, totalData: { value: "9" } }))).toMatchObject({ value: 9, netAmount: 0.5 });
  });

  it("levy reports", () => {
    const bill = billLevyTable({ billData: [{ invDate: "2026-11-01", invNo: "B1", netValue: "1", serviceCharge: "1", levy: "1", vatAmount: "1", netAmount: "4" }], totalData: { levy: "5" } });
    expect(bill.rows[0].billNo).toBe("B1");
    expect(computeTotals(bill)).toMatchObject({ levy: 5, netAmount: 4 });
    expect(productLevyTable({ productData: [{ productCode: "P1", productName: "Rice", netAmount: "4" }] }).rows[0]).toMatchObject({ productCode: "P1", productName: "Rice" });
  });
});

describe("Statements and balances", () => {
  it("a statement waits for a customer", () => {
    expect(customerStatementReport.requires?.key).toBe("party");
    expect(computeTotals({ columns: STATEMENT_COLUMNS, rows: [{ invoiceAmount: "0.1", balance: "0.1" }, { invoiceAmount: "0.2", balance: "0.3" }] })).toEqual({ invoiceAmount: 0.3, balance: 0.4 });
  });

  it("Balance total = backend total; a missing total is the sum, not 0", () => {
    const summaryData = [{ code: "1", name: "A", opening: "1", issued: "2", paid: "1", balance: "0.1" }, { code: "2", name: "B", opening: "1", issued: "2", paid: "1", balance: "0.2" }];
    const columns = customerStatementReport.columns ?? [];
    expect(balanceTable({ data: { summaryData, totalData: { total: "9" } } }, columns).totalsOverride).toEqual({ balance: 9 });
    expect(balanceTable({ data: { summaryData, totalData: null } }, columns).totalsOverride).toBeUndefined();
  });
});

describe("Day End and Shift End", () => {
  const excluded = ["DayId", "SNo", "StartDate", "EndDate"];

  it("columns: fixed ones removed, cash columns added, Total last", () => {
    expect(closingColumnNames(["DayId", "SNo", "StartDate", "EndDate", "Total", "Cash"], excluded)).toEqual(["Cash", "Opening Balance", "Pay In", "Pay Out", "Total"]);
    expect(closingColumnNames(["PayIn", "Pay_Out", "OpeningBal"], excluded)).toEqual(["PayIn", "Pay_Out", "OpeningBal"]);
  });

  it("cells accept every spelling of the cash columns", () => {
    expect(closingCell({ PayIn: 2 }, "Pay In")).toBe(2);
    expect(closingCell({ openingBal: "3" }, "OpeningBal")).toBe(3);
    expect(closingCell({ Cash: "4" }, "Cash")).toBe(4);
  });

  it("rows without cash columns read the cashier log; others are not looked up", async () => {
    let calls = 0;
    const detail = async () => { calls += 1; return { cashFlow: { openingBal: 1, payIn: 2, payOut: 3 } }; };
    const rows = await withCashFlow([{ DayId: 1 }, { DayId: 2, PayIn: 9 }], detail);
    expect(calls).toBe(1);
    expect(rows[0]).toMatchObject({ "Opening Balance": 1, "Pay In": 2, "Pay Out": 3 });
    expect(rows[1]).toMatchObject({ "Pay In": 9, "Opening Balance": 0 });
  });

  it("an open day (1900) shows - and totals are exact", () => {
    const t = closingTable([{ StartDate: "2026-11-01T08:00:00", EndDate: "1900-01-01T00:00:00", Cash: "0.1", Total: "0.1" }, { StartDate: "", EndDate: "", Cash: "0.2", Total: "0.2" }], ["Cash", "Total"], excluded, [{ key: "StartDate", label: "Start", kind: "text" }, { key: "EndDate", label: "End", kind: "text" }]);
    expect(t.rows[0]).toMatchObject({ StartDate: "01/11/2026 08:00", EndDate: "-" });
    expect(computeTotals(t)).toMatchObject({ Cash: 0.3, Total: 0.3 });
  });
});

describe("Product Transaction Log", () => {
  const data = {
    logData: [{ transaction: "Sales", voucherNo: "1", qtyIn: "", qtyOut: "2", balance: "8" }, { transaction: "Purchase", voucherNo: "2", qtyIn: "5", qtyOut: "", balance: "13" }],
    totalData: { opening: "10", received: "5", issued: "2", balance: "13" },
  };

  it("waits for a product, which can come from the URL", () => {
    expect(productTransactionLogReport.requires?.key).toBe("product");
    expect(productTransactionLogReport.urlParams).toEqual({ product: "product" });
  });

  it("Transaction filter, text summary, and no totals row", () => {
    const t = logTable(data, "sales");
    expect(t.rows).toHaveLength(1);
    expect(t.summary).toContainEqual({ label: "Closing Balance", value: "13" });
    expect(toMatrix(t, fmt).footer).toBeNull();
  });

  it("the empty message keeps Opening and Closing", () => {
    expect(logTable({ logData: [], totalData: data.totalData }, "All").emptyMessage).toContain("Opening: 10");
    expect(logTable(null, "All").emptyMessage).toContain("Closing Balance: -");
  });
});

describe("Framework cells", () => {
  it("only a marked cell is blank; an empty API value and a zero still show 0", () => {
    const col = { key: "price", label: "Price", kind: "money" as const };
    expect(formatCell(col, BLANK_CELL, fmt)).toBe("");
    expect(formatCell(col, "", fmt)).toBe(formatAmount(0));
    expect(formatCell(col, 0, fmt)).toBe(formatAmount(0));
  });

  it("the Purchase Return definition still has its columns", () => {
    expect(purchaseReturnReport.columns?.length).toBeGreaterThan(0);
  });
});
