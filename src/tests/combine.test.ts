/**
 * COMBINE (real samples: orders 292 + 293 and GET /order/combine/combined-orders).
 * Mirrors PosCombineModal: mapper → exact stored pricing → load → cart engine.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { mapOrderDetailsToCartItems } from "../features/pos/terminal/mappers/orderDetailToCartMapper";
import { applyStoredPricingToCartItems } from "../features/pos/services/storedOrderView";
import { deriveOrderChargeRatesFromMaster } from "../features/pos/pricing";
import posReducer, { loadRecalledOrder } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };
const products = [ABCD, DEMO];
const productCache = { 9: ABCD, 6: DEMO };

// Real response of GET /api/v1/order/combine/combined-orders?OrderIds=292&OrderIds=293
const combined = {
  detailsData: [
    { orderId: 292, productId: 9, productName: "ABCd", unitId: 1, qty: 1, price: 95.4545455, discPer: 0, discAmount: 4.5454545, serviceCharge: 0, levy: 0, vatId: 1, vatAmount: 9.0909091, netAmount: 100, mapId: 1000, complimentaryStatus: false },
    { orderId: 293, productId: 6, productName: "Demo", unitId: 1, qty: 2, price: 10, discPer: 10, discAmount: 2, serviceCharge: 0, levy: 0, vatId: 1, vatAmount: 1.8, netAmount: 19.8, mapId: 1001, complimentaryStatus: false },
  ],
  modifiersData: [
    { orderId: 292, modifierName: "aa", mapId: 1000, modifierId: 1, typeId: 3, qty: 1, price: 4.5454545, amount: 4.5454545 },
  ],
};
// Target order (293 is the highest id) as returned by getOrderDetails (menu endpoint master)
const target293 = {
  masterData: { orderNo: 293, orderTypeId: 2, orderType: "TakeOut", discAmount: 0, discPer: 0, serviceCharge: 0, levy: 0, vatExclAmount: 18, vatAmount: 1.8, netAmount: 19.8 },
  detailsData: [{ productId: 6, qty: 2, price: 10, discPer: 10, discAmount: 2, serviceCharge: 0, levy: 0, vatValue: 10, vatAmount: 1.8, netAmount: 19.8, mapId: 1 }],
  modifiersData: null,
};

const combine = () => {
  const raw = mapOrderDetailsToCartItems(combined.detailsData, combined.modifiersData, { products, productCache });
  const exact = applyStoredPricingToCartItems(
    { masterData: {}, detailsData: combined.detailsData, modifiersData: combined.modifiersData },
    raw,
    { products, productCache, isBillDiscount: false, view: "Exclusive" }
  );
  const cartItems = exact.map((item: any, idx: number) => ({ ...item, mapId: idx + 1, billDiscountAmount: 0 }));
  let state = posReducer(undefined, { type: "@@init" } as any);
  state = posReducer(state, loadRecalledOrder({
    editingOrderRates: deriveOrderChargeRatesFromMaster(target293, "Exclusive"),
    editingOrderId: 293, cartItems, orderTypeId: 2, orderTypeName: "TakeOut",
    billDiscountValue: 0, billDiscountType: "percentage", isCartModified: true,
  } as any));
  return { exact, calc: selectCartCalculation({ pos: { ...state, productCache } } as any) };
};

describe("combine orders 292 + 293", () => {
  for (const discCalc of ["Inclusive", "Exclusive"] as const) {
    describe(`discount calculation ${discCalc}`, () => {
      beforeEach(() => {
        localStorage.clear();
        // current settings deliberately different (SC 10 / levy 5) — combined TakeOut orders keep their saved rates
        localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
        localStorage.setItem("discCalc", discCalc);
        localStorage.setItem("priceView", "Inclusive");
      });

      it("items are restored exactly: ABCd 100.000 + extra 5.000, discounts 5.000 / 10%", () => {
        const { exact } = combine();
        const abcd: any = exact[0];
        const demo: any = exact[1];
        expect(abcd.price).toBeCloseTo(100, 6);
        expect(abcd.isIncl).toBe(true);
        expect(abcd.extras?.[0].price).toBeCloseTo(5, 6);
        expect(abcd.discountType).toBe("amount");
        expect(abcd.discountValue).toBeCloseTo(discCalc === "Inclusive" ? 5 : 4.5454545, 6);
        expect(demo.price).toBeCloseTo(10, 6);
        expect(demo.isIncl).toBe(false);
        expect(demo).toMatchObject({ discountType: "percentage", discountValue: 10 });
      });

      it("combined cart total = 100.000 + 19.800 = 119.800 (no service charge / levy added)", () => {
        const { calc } = combine();
        expect(calc.lines[0].lineNetAmount).toBeCloseTo(100, 4);
        expect(calc.lines[1].lineNetAmount).toBeCloseTo(19.8, 4);
        expect(calc.summary.grandTotal).toBeCloseTo(119.8, 4);
        expect(calc.summary.serviceCharge).toBe(0);
        expect(calc.summary.levy).toBe(0);
        expect(calc.summary.vatAmount).toBeCloseTo(9.0909091 + 1.8, 5);
      });
    });
  }
});
