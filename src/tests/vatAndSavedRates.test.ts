/**
 * 1. VAT on/off follows the POS configuration (stale localStorage keys cannot override it).
 * 2. VAT is never invented for saved orders whose stored VAT is 0.
 * 3. Editing a saved order keeps the service charge / levy it was SAVED with —
 *    cart and saved payload use the same rates.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getVatStatus } from "../features/pos/terminal/utils/billing";
import { deriveOrderChargeRates } from "../features/pos/pricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import posReducer, { updateItemQty, clearCart, setOrderTypeByName } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";

const setConfig = (configs: Record<string, unknown>) => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs }));
};

describe("VAT on/off source", () => {
  beforeEach(() => localStorage.clear());

  it("config vatStatus=false wins over a stale enableVat=true key", () => {
    setConfig({ vatStatus: false });
    localStorage.setItem("enableVat", "true");
    expect(getVatStatus()).toBe(false);
  });
  it("config vatStatus=true wins over a stale enableVat=false key", () => {
    setConfig({ vatStatus: true });
    localStorage.setItem("enableVat", "false");
    expect(getVatStatus()).toBe(true);
  });
  it("legacy key is used only when the config does not say", () => {
    setConfig({ levy: 0 });
    localStorage.setItem("enableVat", "true");
    expect(getVatStatus()).toBe(true);
  });
});

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 0, isIncl: false };
const products = [ABCD, DEMO];
const productCache = { 9: ABCD, 6: DEMO };

// Saved Dine-In with SC 10%, levy 5%
const order283 = {
  masterData: { orderNo: 283, orderType: "DineIn", orderTypeId: 1, discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatExclAmount: 95.4545455, vatAmount: 9.5454545, netAmount: 105 },
  detailsData: [{ qty: 1, productId: 9, productName: "ABCd", price: 82.6446281, amount: 82.6446281, discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatAmount: 9.5454545, mapId: 1 }],
  modifiersData: [{ qty: 1, modifierId: 1, modifierName: "aa", price: 3.9354585, mapId: 1 }],
};

const loadForEdit = (order: any, view: "Inclusive" | "Exclusive") => {
  const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order)) }, view).data;
  let action: any = null;
  loadSettledOrderIntoCart({ orderId: 1, orderData: data, dispatch: ((a: any) => (action = a)) as any, products, productCache, showToast: () => {} });
  let state = posReducer(undefined, { type: "@@init" } as any);
  state = posReducer(state, action);
  state = { ...state, productCache } as any;
  return { action, state };
};

describe("VAT is never invented for zero-VAT saved orders", () => {
  it("zero-rated settled order loads with VAT 0", () => {
    setConfig({ vatStatus: true, serviceCharges: 0, levy: 0 });
    const zero = {
      masterData: { orderNo: 900, orderType: "TakeOut", orderTypeId: 2, discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 10, vatAmount: 0, netAmount: 10 },
      detailsData: [{ qty: 1, productId: 6, productName: "Demo", price: 10, amount: 10, discAmount: 0, serviceCharge: 0, levy: 0, vatAmount: 0, mapId: 1 }],
      modifiersData: null,
    };
    const { action } = loadForEdit(zero, "Exclusive");
    expect(action.payload.authoritativeTax).toBe(0);
    expect(action.payload.authoritativeNetAmount).toBe(10);
  });
});

describe("editing keeps the order's SAVED service charge and levy", () => {
  it("rates are derived from stored amounts in both views", () => {
    expect(deriveOrderChargeRates(order283, "Exclusive")).toEqual({ serviceCharge: 10, levy: 5 });
    const incl = applyStoredOrderView({ data: order283 }, "Inclusive").data;
    expect(deriveOrderChargeRates(incl, "Inclusive")).toEqual({ serviceCharge: 10, levy: 5 });
  });

  for (const view of ["Inclusive", "Exclusive"] as const) {
    it(`#283 edited while settings are SC 0% / levy 0% still uses 10% / 5% (${view})`, () => {
      setConfig({ vatStatus: true, serviceCharges: 0, levy: 0, priceView: view, discountCalc: "Inclusive" });
      localStorage.setItem("priceView", view);
      const { action, state } = loadForEdit(order283, view);
      expect(action.payload.editingOrderRates).toEqual({ serviceCharge: 10, levy: 5 });

      // modify the cart → recalculated with the saved rates: 2 × ABCd (100 incl) + extra 5 = 205
      const edited = posReducer(state, updateItemQty({ uniqueId: state.cartItems[0].uniqueId, quantity: 2 }));
      const calc = selectCartCalculation({ pos: edited } as any);
      expect(calc.summary.serviceCharge).toBeGreaterThan(0);
      expect(calc.summary.grandTotal).toBeCloseTo(205, 3);

      // the saved payload uses the same rates → same total
      const payload = buildDirectSettleOrderPayload(
        {
          cartDetails: calc.lines,
          tax: calc.summary.vatAmount,
          total: calc.summary.grandTotal,
          deliveryCharge: 0,
          selectedOrderTypeName: edited.selectedOrderTypeName,
          selectedOrderTypeId: edited.selectedOrderTypeId,
          billDiscountValue: 0,
          billDiscountType: "percentage",
          editingOrderRates: edited.editingOrderRates,
        } as any,
        { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-03" } as any
      );
      expect(payload.netAmount).toBeCloseTo(205, 3);
      expect(payload.serviceCharge).toBeCloseTo(calc.summary.serviceCharge, 6);
      expect(payload.levy).toBeCloseTo(calc.summary.levy, 6);
      const sumNet = payload.details.reduce((s: number, d: any) => s + d.netAmount, 0);
      expect(sumNet).toBeCloseTo(205, 3);
    });
  }

  it("saved rates are cleared by clearCart and by changing the order type", () => {
    setConfig({ vatStatus: true, serviceCharges: 0, levy: 0 });
    localStorage.setItem("priceView", "Exclusive");
    const { state } = loadForEdit(order283, "Exclusive");
    expect(state.editingOrderRates).toEqual({ serviceCharge: 10, levy: 5 });
    expect(posReducer(state, clearCart()).editingOrderRates).toBeNull();
    expect(posReducer(state, setOrderTypeByName("TakeOut")).editingOrderRates).toBeNull();
    expect(posReducer(state, setOrderTypeByName(state.selectedOrderTypeName)).editingOrderRates).toEqual({ serviceCharge: 10, levy: 5 });
  });
});
