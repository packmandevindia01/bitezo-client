/**
 * Live-cart prints (KOT after Order, packager / guest print from the cart) follow PRINT PRICE and
 * show exactly the cart engine's numbers.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder, getBillingConfigForOrder } from "../features/pos/terminal/utils/billing";
import { buildUnifiedOrderPricing } from "../features/pos/utils/orderPricing";
import { applyCartPricingToUnified } from "../features/pos/utils/printPricing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };
const cart = () => [
  { uniqueId: "a", productId: 9, quantity: 2, price: 100, isIncl: true, product: ABCD, extras: [{ id: 1, name: "aa", price: 5, qty: 1, typeId: 2 }] },
  { uniqueId: "b", productId: 6, quantity: 1, price: 10, isIncl: false, product: DEMO, discountValue: 10, discountType: "percentage" as const },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
  localStorage.setItem("priceView", "Exclusive"); // screen
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("kotArabic", "Disable");
});

const printOf = (lines: any[], printPrice: "Inclusive" | "Exclusive") => {
  const unified = buildUnifiedOrderPricing(lines, { orderType: "DineIn" });
  return applyCartPricingToUnified(unified, lines, { printPrice, orderType: "DineIn" })!;
};

describe("cart prints use the cart engine values in the Print Price view", () => {
  it("Inclusive print while the screen is Exclusive", () => {
    const calc = calculateOrder(cart(), { orderType: "DineIn", orderTypeId: 1 });
    const p = printOf(calc.lines, "Inclusive");
    expect(p.lines[0].getAmount(true)).toBeCloseTo(205, 6); // 2 × 100 + extra 5 (all inclusive)
    expect(p.lines[1].getAmount(true)).toBeCloseTo(10 * 1.2705 * 0.9, 6);
    expect(p.lines[1].getDiscount(true)).toBeCloseTo(10 * 1.2705 * 0.1, 6);
    expect(p.summary.grandTotal).toBeCloseTo(calc.summary.grandTotal, 6);
    expect(p.summary.vatAmount).toBeCloseTo(calc.summary.vatAmount, 6);
    expect(p.summary.serviceCharge).toBeCloseTo(calc.summary.serviceCharge, 6);
  });

  it("Exclusive print", () => {
    const calc = calculateOrder(cart(), { orderType: "DineIn", orderTypeId: 1 });
    const p = printOf(calc.lines, "Exclusive");
    expect(p.lines[0].getAmount(false)).toBeCloseTo(205 / 1.2705, 6);
    expect(p.summary.subTotalExclusive).toBeCloseTo(calc.summary.subTotalExclusive!, 6);
  });

  it("re-order KOT prints only the added quantity", () => {
    const calc = calculateOrder(cart(), { orderType: "DineIn", orderTypeId: 1 });
    const reorder = [{ ...calc.lines[0], quantity: 1 }, calc.lines[1]];
    const p = printOf(reorder, "Inclusive");
    expect(p.lines[0].getAmount(true)).toBeCloseTo(205 / 2, 6);
  });

  it("edited order printed with its SAVED rates (SC 0 / levy 0) — not current SC 10 / levy 5", () => {
    const calc = calculateOrder(cart(), {
      orderType: "DineIn", orderTypeId: 1,
      config: getBillingConfigForOrder("DineIn", { serviceCharge: 0, levy: 0 }),
    });
    const p = printOf(calc.lines, "Inclusive");
    expect(p.summary.serviceCharge).toBe(0);
    expect(p.summary.levy).toBe(0);
    expect(p.lines[0].getAmount(true)).toBeCloseTo(205, 6); // inclusive price unchanged
    expect(p.summary.grandTotal).toBeCloseTo(calc.summary.grandTotal, 6);
  });

  it("KOT html shows the engine amount in the Print Price view", async () => {
    const calc = calculateOrder(cart(), { orderType: "DineIn", orderTypeId: 1 });
    const html = await generateKotHtml(calc.lines as any, {
      orderNo: "1", ticketNo: "1", waiter: "w", orderType: "DineIn", printPrice: "Inclusive",
    } as any);
    expect(html).toMatch(/>\s*205\.000\s*</);
  });
});
