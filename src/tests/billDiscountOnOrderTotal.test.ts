/**
 * Older orders can hold a bill discount only on the order total, with nothing on the lines. The saved totals give
 * the discount in the view the lines are in, so nothing is worked out from tax settings.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { withBillDiscountOnLines } from "../features/pos/pricing";
import { buildPrintPricing } from "../features/pos/utils/printPricing";

const line = (over: Record<string, unknown>) => ({ productId: 1, productName: "Demo", qty: 1, discAmount: 0, mapId: 1, ...over });

beforeEach(() => localStorage.clear());

describe("bill discount saved only on the order total", () => {
  it("Exclusive lines: Sub Total, Discount and charges add up", () => {
    const order = { masterData: { discAmount: 10, levy: 0.5, vatExclAmount: 10.5, vatAmount: 1.05, netAmount: 11.55 }, detailsData: [line({ qty: 2, price: 10, amount: 20, levy: 0.5, vatAmount: 1.05 })] };
    const { summary } = buildPrintPricing(order, { dataView: "Exclusive", printPrice: "Exclusive" });
    expect(summary.subTotalExclusive).toBeCloseTo(20, 6);
    expect(summary.totalDiscountExcl).toBeCloseTo(10, 6);
    expect(summary.isBillDiscount).toBe(true);
    expect(summary.grandTotal).toBe(11.55);
  });

  it("Inclusive lines, discount saved exclusive (order 111)", () => {
    const order = { masterData: { discAmount: 21.2908304, serviceCharge: 7.870917, levy: 4.3290043, vatExclAmount: 90.9090909, vatAmount: 9.0909091, netAmount: 100 }, detailsData: [line({ price: 127.05, amount: 127.05, serviceCharge: 7.870917, levy: 4.3290043, vatAmount: 9.0909091 })] };
    const { summary } = buildPrintPricing(order, { dataView: "Inclusive", printPrice: "Inclusive" });
    expect(summary.subTotalExclusive).toBeCloseTo(100, 3);
    expect(summary.totalDiscountExcl).toBeCloseTo(21.291, 3);
    expect(summary.totalDiscountIncl).toBeCloseTo(27.05, 3);
  });

  it("Inclusive lines, discount saved inclusive (order 84)", () => {
    const order = { masterData: { discAmount: 13, vatExclAmount: 18.182, vatAmount: 1.818, netAmount: 20 }, detailsData: [line({ qty: 3, price: 11, vatAmount: 1.818, vatValue: 10 })] };
    const { summary } = buildPrintPricing(order, { dataView: "Inclusive", printPrice: "Inclusive" });
    expect(summary.subTotalExclusive).toBeCloseTo(30, 3);
    expect(summary.totalDiscountExcl).toBeCloseTo(11.818, 3);
  });

  it("is spread over the lines by amount", () => {
    const order = { masterData: { discAmount: 3, vatExclAmount: 27 }, detailsData: [line({ amount: 10 }), line({ amount: 20, mapId: 2 })] };
    const [a, b] = withBillDiscountOnLines(order, "Exclusive").detailsData;
    expect(a.discAmount).toBeCloseTo(1, 6);
    expect(b.discAmount).toBeCloseTo(2, 6);
  });

  it("uses the saved discount when the order has no saved totals", () => {
    const order = { masterData: { discAmount: 2 }, detailsData: [line({ amount: 10 })] };
    expect(withBillDiscountOnLines(order, "Exclusive").detailsData[0].discAmount).toBe(2);
  });

  it("leaves an order alone when a line has a discount, or there is none", () => {
    const withLine = { masterData: { discAmount: 2, vatExclAmount: 8 }, detailsData: [line({ amount: 10, discAmount: 2 })] };
    const none = { masterData: { discAmount: 0, vatExclAmount: 10 }, detailsData: [line({ amount: 10 })] };
    expect(withBillDiscountOnLines(withLine, "Exclusive")).toBe(withLine);
    expect(withBillDiscountOnLines(none, "Exclusive")).toBe(none);
  });
});
