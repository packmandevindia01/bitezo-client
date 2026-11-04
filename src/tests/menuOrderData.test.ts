/**
 * /menu/order/order_data (real order #287) + merge with /order/recall/order_data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mergeStoredOrderSources, storedOrderFooter } from "../features/pos/pricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import posReducer, { updateItemQty } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";

vi.mock("../api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import axiosInstance from "../api/axiosInstance";
import { orderApi } from "../features/pos/services/orderApi";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const products = [ABCD];
const productCache = { 9: ABCD };

// Real response body of GET /api/v1/menu/order/order_data/287
const menu287 = {
  masterData: {
    orderNo: 287, ticketNo: 287, orderTypeId: 2, sectionId: 0, tableId: 0, customerId: 1, customerName: "CASH CUSTOMER",
    deliveryCharge: 0, discAmount: 0, discPer: 0, serviceCharge: 0, levy: 0,
    vatExclAmount: 259.0909091, vatAmount: 25.9090909, netAmount: 285, updatedAt: "2026-11-03T12:55:17.683+05:30",
  },
  detailsData: [{
    productId: 9, productName: "ABCd", unitId: 1, qty: 3, price: 90.9090909, discPer: 0, discAmount: 13.6363636,
    serviceCharge: 0, levy: 0, vatId: 1, vatValue: 10, vatAmount: 25.9090909, netAmount: 285, mapId: 1, complimentaryStatus: false,
  }],
  modifiersData: null,
};

const setConfig = (view: "Inclusive" | "Exclusive") => {
  localStorage.clear();
  localStorage.setItem("priceView", view);
  localStorage.setItem("printPrice", view);
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0, discountCalc: "Inclusive", priceView: view } }));
};

describe("merge of the two saved-order endpoints", () => {
  it("menu-only: fills orderType name from orderTypeId and amount = price × qty", () => {
    const m = mergeStoredOrderSources(null, menu287)!;
    expect(m.masterData.orderType).toBe("TakeOut");
    expect(m.detailsData![0].amount).toBeCloseTo(272.7272727, 6);
  });

  it("recall + menu: keeps recall prices/extras/display fields, adds stored vatValue/discPer/netAmount", () => {
    const recall = {
      masterData: { orderNo: 287, orderType: "TakeOut", waiter: "emp1", discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 259.0909091, vatAmount: 25.9090909, netAmount: 285 },
      detailsData: [{ qty: 3, productId: 9, productName: "ABCd", price: 90.9090909, amount: 272.7272727, discAmount: 13.6363636, serviceCharge: 0, levy: 0, vatAmount: 25.9090909, mapId: 1 }],
      modifiersData: [{ qty: 1, modifierId: 4, modifierName: "x", price: 0, mapId: 1 }],
    };
    const m = mergeStoredOrderSources(recall, menu287)!;
    expect(m.masterData.waiter).toBe("emp1");
    expect(m.masterData.discPer).toBe(0);
    expect(m.masterData.updatedAt).toBe("2026-11-03T12:55:17.683+05:30");
    expect(m.detailsData![0]).toMatchObject({ price: 90.9090909, amount: 272.7272727, vatValue: 10, vatId: 1, netAmount: 285, discPer: 0 });
    expect(m.modifiersData).toEqual(recall.modifiersData);
  });
});

describe("order #287 (item discount 15.000 incl on 3 × ABCd 100.000 incl)", () => {
  for (const view of ["Inclusive", "Exclusive"] as const) {
    it(`footer and edit reproduce the stored values (${view})`, () => {
      setConfig(view);
      const data = applyStoredOrderView({ data: mergeStoredOrderSources(null, menu287)! }, view).data;
      const footer = storedOrderFooter(data, view);
      expect(footer.netAmount).toBe(285);
      expect(footer.discount).toBeCloseTo(13.6363636, 6);
      expect(footer.subTotal).toBeCloseTo(272.7272727, 6);

      let action: any = null;
      loadSettledOrderIntoCart({ orderId: 287, orderData: data, dispatch: ((a: any) => (action = a)) as any, products, productCache, showToast: () => {} });
      let state = posReducer(undefined, { type: "@@init" } as any);
      state = { ...posReducer(state, action), productCache } as any;
      expect(state.cartItems[0].savedVatRate).toBe(10);

      // Edit: 3 → 4. Fixed 15.000 inclusive discount stays → 400 − 15 = 385
      const edited = posReducer(state, updateItemQty({ uniqueId: state.cartItems[0].uniqueId, quantity: 4 }));
      const calc = selectCartCalculation({ pos: edited } as any);
      expect(calc.summary.grandTotal).toBeCloseTo(385, 3);
    });
  }
});

describe("getOrderDetails uses both endpoints", () => {
  beforeEach(() => { setConfig("Exclusive"); (axiosInstance.get as any).mockReset(); });

  it("falls back to /menu/order/order_data when the recall endpoint fails", async () => {
    (axiosInstance.get as any).mockImplementation((url: string) =>
      url.startsWith("/order/recall") ? Promise.reject(new Error("500")) : Promise.resolve({ data: { isSuccess: true, data: menu287 } })
    );
    const res = await orderApi.getOrderDetails(287, { priceView: "Exclusive" });
    expect(res.data.masterData.orderType).toBe("TakeOut");
    expect(res.data.detailsData[0].vatValue).toBe(10);
  });

  it("throws when both endpoints fail", async () => {
    (axiosInstance.get as any).mockRejectedValue(new Error("down"));
    await expect(orderApi.getOrderDetails(287)).rejects.toThrow("down");
  });
});

// Real response body of GET /api/v1/menu/order/order_data/276 (Dine-In saved with SC 0 / levy 0, 2 × ABCd + extra "aa" 5.000)
const menu276 = {
  masterData: {
    orderNo: 276, ticketNo: 276, orderTypeId: 1, sectionId: 1, sectionName: "upper", tableId: 2, tableNo: "T2", customerId: 1,
    deliveryCharge: 0, discAmount: 0, discPer: 0, serviceCharge: 0, levy: 0,
    vatExclAmount: 186.3636364, vatAmount: 18.6363636, netAmount: 205, updatedAt: "2026-11-03T09:24:48.254+05:30",
  },
  detailsData: [{
    productId: 9, productName: "ABCd", unitId: 1, qty: 2, price: 93.1818182, discPer: 0, discAmount: 0,
    serviceCharge: 0, levy: 0, vatId: 1, vatValue: 10, vatAmount: 18.6363636, netAmount: 205, mapId: 1, complimentaryStatus: false,
  }],
  modifiersData: [{ modifierName: "aa", mapId: 1, modifierId: 1, typeId: 3, qty: 1, price: 4.5454545, amount: 4.5454545, status: "Extras" }],
};

describe("order #276 (menu endpoint, extras with amount, Dine-In saved with SC 0%)", () => {
  for (const view of ["Inclusive", "Exclusive"] as const) {
    it(`edit keeps 205.000 even though current settings are SC 10% / levy 5% (${view})`, () => {
      localStorage.clear();
      localStorage.setItem("priceView", view);
      localStorage.setItem("discCalc", "Inclusive");
      localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5, discountCalc: "Inclusive", priceView: view } }));
      const data = applyStoredOrderView({ data: mergeStoredOrderSources(null, menu276)! }, view).data;
      expect(data.masterData.orderType).toBe("DineIn");
      expect(storedOrderFooter(data, view).netAmount).toBe(205);

      let action: any = null;
      const all: any[] = [];
      loadSettledOrderIntoCart({ orderId: 276, orderData: data, dispatch: ((a: any) => { all.push(a); if (String(a?.type).endsWith("loadRecalledOrder")) action = a; return a; }) as any, products, productCache, showToast: () => {} });
      expect(all.map((a) => a.type)).toContain("pos/loadRecalledOrder");
      expect(action.payload.editingOrderRates).toEqual({ serviceCharge: 0, levy: 0 });
      // Apply EVERY action settled-edit dispatches, in order, exactly like the app does
      let state = posReducer(undefined, { type: "@@init" } as any);
      for (const act of all) if (act && typeof act === "object" && act.type) state = posReducer(state, act);
      state = { ...state, productCache } as any;
      expect(state.editingOrderRates).toEqual({ serviceCharge: 0, levy: 0 });
      const item = state.cartItems[0];
      expect(item.price).toBeCloseTo(100, 6);          // product only, extra removed
      expect(item.isIncl).toBe(true);
      expect(item.extras?.[0].price).toBeCloseTo(5, 6); // extra back to its gross price

      // Unchanged cart recalculates to the stored total
      expect(selectCartCalculation({ pos: { ...state, isCartModified: true } } as any).summary.grandTotal).toBeCloseTo(205, 3);
      // Edit 2 → 3: 300 + 5 = 305 (saved SC 0 / levy 0 kept)
      const edited = posReducer(state, updateItemQty({ uniqueId: item.uniqueId, quantity: 3 }));
      expect(selectCartCalculation({ pos: edited } as any).summary.grandTotal).toBeCloseTo(305, 3);
    });
  }
});
