/**
 * Purchase invoice / purchase return line maths (transaction/shared/purchaseCalc.ts):
 * exact decimal, 14 dp half-up, and the header is ALWAYS the exact Σ of the lines.
 * (Before: the invoice sent lines rounded to 3 dp with an unrounded header; the return rounded both.)
 */
import { describe, it, expect } from "vitest";
import { calculatePurchaseLine, sumPurchaseLines } from "../features/transaction/shared/purchaseCalc";
import { sumMoney } from "../utils/money";

describe("purchase line maths", () => {
  it("qty × price, VAT on the amount", () => {
    expect(calculatePurchaseLine(3, 1.1, 10)).toEqual({ amount: 3.3, discountAmount: 0, vatAmount: 0.33, netAmount: 3.63 });
  });

  it("bill discount is shared in proportion to amount and the shares add back exactly", () => {
    const gross = 10 + 20 + 3.333;
    const lines = [
      calculatePurchaseLine(1, 10, 10, gross, 5),
      calculatePurchaseLine(2, 10, 5, gross, 5),
      calculatePurchaseLine(3, 1.111, 0, gross, 5),
    ];
    expect(sumMoney(lines.map((l) => l.discountAmount))).toBeCloseTo(5, 13);
    lines.forEach((l) => expect(l.netAmount).toBe(sumMoney([l.amount, -l.discountAmount, l.vatAmount])));
  });

  it("header = exact Σ of lines (+ other charge + round-off)", () => {
    const lines = [calculatePurchaseLine(3, 3.333, 10), calculatePurchaseLine(7, 0.142857, 5, 0, 0)];
    const t = sumPurchaseLines(lines, 1.5, -0.001);
    expect(t.netAmount).toBe(sumMoney(lines.map((l) => l.netAmount)));
    expect(t.vatAmount).toBe(sumMoney(lines.map((l) => l.vatAmount)));
    expect(t.vatExclAmount).toBe(sumMoney([t.netAmount, -t.vatAmount]));
    expect(t.grandTotal).toBe(sumMoney([t.netAmount, 1.5, -0.001]));
  });

  it("no float noise: 0.1 × 3 = 0.3, 1.1 × 3 = 3.3", () => {
    expect(calculatePurchaseLine(3, 0.1, 0).amount).toBe(0.3);
    expect(calculatePurchaseLine(3, 1.1, 0).amount).toBe(3.3); // plain JS: 3.3000000000000003
  });

  it("bad inputs are treated as 0", () => {
    expect(calculatePurchaseLine("", "abc", undefined)).toEqual({ amount: 0, discountAmount: 0, vatAmount: 0, netAmount: 0 });
  });
});
