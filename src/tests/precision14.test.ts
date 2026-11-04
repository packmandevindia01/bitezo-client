/**
 * 14-decimal precision, rounded HALF-UP (never truncated) — the cases from the precision analysis.
 * Truncation turned these into 4.999 / 9.999 on screen; exact decimal + half-up keeps them whole.
 * Dine-In: service charge 10 %, levy 5 %, VAT 10 % → factor 1.2705.
 */
import { describe, it, expect } from "vitest";
import { priceLine, priceBill, allocateProportionally, lineRates } from "../features/pos/pricing";
import { round, sumMoney, CALC_PRECISION } from "../utils/money";
import { formatAmount } from "../utils/formatters";
import type { PricingSettings } from "../features/pos/pricing";

const dineIn: PricingSettings = {
  vatEnabled: true, defaultVatRate: 10, serviceChargeRate: 10, levyRate: 5,
  discountCalc: "Inclusive", priceView: "Inclusive",
};
const show = (v: number) => formatAmount(v, 3);

describe("money basics", () => {
  it("precision is 14 decimals", () => expect(CALC_PRECISION).toBe(14));

  it("the combined factor is exact (float gives 1.2705000000000004)", () => {
    expect(lineRates(10, dineIn).factor).toBe(1.2705);
  });

  it("rounds half-up, never truncates", () => {
    expect(round(9.999999999999995)).toBe(10);          // 14 dp half-up
    expect(round(4.999999999999993)).toBe(4.99999999999999);
    expect(round(1.0005, 3)).toBe(1.001);                // fils half-up
    expect(round(-1.0005, 3)).toBe(-1.001);              // away from zero
    // eslint-disable-next-line no-loss-of-precision -- deliberately a float-noise value
    expect(round(69.87749999999999, 3)).toBe(69.878);    // float noise ignored at display
  });

  it("exact sums (no 0.30000000000000004)", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([2.675, 1.325])).toBe(4);
    expect(sumMoney([1.1, 2.2, 3.3])).toBe(6.6); // plain JS: 6.6000000000000005
  });

  it("known limit: a JS number holds ~15–16 significant digits, so a 16-digit amount loses its last decimal", () => {
    // 90.90909090909091 cannot be stored exactly in a JS number (it becomes 90.9090909090909),
    // so this pair sums to 99.99999999999999. Inside the engine the maths stays exact decimal; this only
    // affects values that pass through a JS number (payloads, the backend `double` DTOs).
    expect(String(90.90909090909091)).toBe("90.9090909090909");
    expect(sumMoney([90.90909090909091, 9.09090909090909])).toBeCloseTo(100, 13);
  });
});

describe("the analysis cases now stay whole", () => {
  it("extra 5 (VAT included) → exclusive → back to inclusive = 5.000", () => {
    const line = priceLine({ qty: 1, unitPrice: 0, priceIncludesTax: true, vatRate: 10, extras: [{ price: 5, qty: 1 }] }, dineIn);
    expect(line.extras[0].grossPrice).toBe(5);
    expect(line.lineNet).toBeCloseTo(5, 13);
    expect(show(line.lineNet)).toBe("5.000");                         // truncated it was 4.999
    expect(show(line.extras[0].basePrice * line.factor)).toBe("5.000");
  });

  it("product 12.705 (VAT included) → exclusive base 10.000, not 9.999", () => {
    const line = priceLine({ qty: 1, unitPrice: 12.705, priceIncludesTax: true, vatRate: 10 }, dineIn);
    expect(line.baseUnitPrice).toBe(10);
    expect(line.lineNet).toBe(12.705);
    expect(show(line.baseUnitPrice)).toBe("10.000");
  });

  it("3 × 12.705 → 38.115 exactly", () => {
    const line = priceLine({ qty: 3, unitPrice: 12.705, priceIncludesTax: true, vatRate: 10 }, dineIn);
    expect(line.lineNet).toBe(38.115);
    expect(line.productBase).toBe(30);
  });

  it("bill discount 10 split over 3 lines adds back to exactly 10", () => {
    const parts = allocateProportionally(10, [3.335, 3.335, 3.33]);
    expect(sumMoney(parts)).toBe(10);
    expect(show(sumMoney(parts))).toBe("10.000");
  });

  it("10 ÷ 3 split adds back to exactly 10", () => {
    const parts = allocateProportionally(10, [1, 1, 1]);
    expect(sumMoney(parts)).toBe(10);
  });

  it("whole bill: Σ line nets = grand total, and the total shows to the fil", () => {
    const bill = priceBill({
      lines: [
        { qty: 1, unitPrice: 12.705, priceIncludesTax: true, vatRate: 10, extras: [{ price: 5, qty: 1 }] },
        { qty: 3, unitPrice: 3.333, priceIncludesTax: false, vatRate: 10 },
        { qty: 2, unitPrice: 7.1, priceIncludesTax: true, vatRate: 0 },
      ],
      billDiscount: { type: "amount", value: 2 },
    }, dineIn);
    expect(bill.totals.grandTotal).toBe(sumMoney(bill.lines.map((l) => l.lineNet)));
    expect(bill.totals.vatAmount).toBe(sumMoney(bill.lines.map((l) => l.vatAmount)));
    expect(bill.totals.billDiscountExclusive).toBeGreaterThan(0);
    // the typed inclusive discount comes back exactly
    expect(round(bill.totals.billDiscountInclusive, 10)).toBe(2);
  });
});
