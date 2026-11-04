/**
 * HAPPY HOUR (promo) pricing: the backend's promo price IS the line price, with the backend's
 * inclusive / exclusive flag (useProductSelection). Bill discounts and manual price changes then
 * work normally on top.
 */
import { describe, it, expect, beforeEach } from "vitest";
import posReducer, { addToCart, updateItemPrice } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";
import { calculateOrder } from "../features/pos/terminal/utils/billing";

const BURGER = { id: 1, name: "Burger", price: 10, vatValue: 10, isIncl: true };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
  localStorage.setItem("discCalc", "Inclusive");
});

/** What useProductSelection now adds for Burger during Happy Hour (promo 8.000, promoIsIncl from backend). */
const happyHourCart = (promoIsIncl: boolean) => {
  let s: any = posReducer(undefined, { type: "@@init" } as any);
  s = { ...s, productCache: { 1: BURGER }, selectedOrderTypeName: "TakeOut", selectedOrderTypeId: 2 };
  return posReducer(s, addToCart({ uniqueId: "a", productId: 1, price: 8, isIncl: promoIsIncl, quantity: 1 } as any));
};

describe("Happy Hour price", () => {
  it("promo price inclusive (backend flag) → customer pays 8.000", () => {
    expect(selectCartCalculation({ pos: happyHourCart(true) } as any).summary.grandTotal).toBeCloseTo(8, 6);
  });
  it("promo price exclusive (backend flag) → 8.000 + 10% VAT = 8.800", () => {
    expect(selectCartCalculation({ pos: happyHourCart(false) } as any).summary.grandTotal).toBeCloseTo(8.8, 6);
  });
  it("10% bill discount on top of Happy Hour → 7.200 (was 9.000)", () => {
    const s = happyHourCart(true);
    const calc = calculateOrder(s.cartItems, { orderType: "TakeOut", orderTypeId: 2, productCache: s.productCache, billDiscountValue: 10, billDiscountType: "percentage" });
    expect(calc.summary.grandTotal).toBeCloseTo(7.2, 6);
  });
  it("manual price change on a Happy Hour item → exactly the typed price (was 9.600)", () => {
    const s = posReducer(happyHourCart(true), updateItemPrice({ uniqueId: "a", price: 12, isIncl: true }));
    expect(selectCartCalculation({ pos: s } as any).summary.grandTotal).toBeCloseTo(12, 6);
  });
});
