/**
 * MANUAL PRICE CHANGE rule: if the product is configured Inclusive, a manually entered price is
 * Inclusive; otherwise it is Exclusive — whatever the screen's Price View.
 * Mirrors PosTerminalPage.handleApplyPrice → updateItemPrice.
 */
import { describe, it, expect, beforeEach } from "vitest";
import posReducer, { addToCart, updateItemPrice } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation, selectCartDetails } from "../features/pos/terminal/store/posSelectors";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };
const OPEN = { id: 5, name: "Open price item", price: 0, vatValue: 10, isIncl: true };

const add = (state: any, p: any) =>
  posReducer(state, addToCart({ uniqueId: `line-${p.id}`, productId: p.id, price: p.price, isIncl: p.isIncl, quantity: 1 } as any));

/** Same resolution as PosTerminalPage.handleApplyPrice */
const applyPrice = (state: any, value: number) => {
  const line = selectCartDetails({ pos: state } as any)[0] as any;
  const isProductConfiguredInclusive = Boolean(line?.isIncl ?? line?.product?.isIncl ?? state.productCache?.[line.productId]?.isIncl);
  return posReducer(state, updateItemPrice({ uniqueId: line.uniqueId, price: value, isIncl: isProductConfiguredInclusive }));
};

const start = (p: any) => {
  let s = posReducer(undefined, { type: "@@init" } as any);
  s = { ...s, productCache: { [p.id]: p }, selectedOrderTypeName: "TakeOut", selectedOrderTypeId: 2 } as any;
  return add(s, p);
};

for (const view of ["Inclusive", "Exclusive"] as const) {
  describe(`manual price — screen Price View ${view}`, () => {
    beforeEach(() => {
      localStorage.clear();
      localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
      localStorage.setItem("priceView", view);
    });

    it("Inclusive product: typed 120.000 is inclusive → customer pays 120.000", () => {
      const s = applyPrice(start(ABCD), 120);
      expect(s.cartItems[0].isIncl).toBe(true);
      expect(selectCartCalculation({ pos: s } as any).summary.grandTotal).toBeCloseTo(120, 6);
    });

    it("Exclusive product: typed 12.000 is exclusive → customer pays 13.200", () => {
      const s = applyPrice(start(DEMO), 12);
      expect(s.cartItems[0].isIncl).toBe(false);
      expect(selectCartCalculation({ pos: s } as any).summary.grandTotal).toBeCloseTo(13.2, 6);
    });

    it("Open-price item (price 0, Inclusive): typed 5.000 → customer pays 5.000", () => {
      const s = applyPrice(start(OPEN), 5);
      expect(selectCartCalculation({ pos: s } as any).summary.grandTotal).toBeCloseTo(5, 6);
    });
  });
}
