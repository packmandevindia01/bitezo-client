/**
 * SPLIT — parts are priced exactly like the original (stored values, saved rates, real order type),
 * and the parts add up to the original order. Mirrors PosSplitModal's item building / bucket pricing.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder, getBillingConfigForOrder } from "../features/pos/terminal/utils/billing";
import { storedLineToCartPricing, deriveOrderChargeRatesFromMaster, ORDER_TYPE_NAMES, mergeStoredOrderSources } from "../features/pos/pricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };
const products = [ABCD, DEMO];

const menu287 = {
  masterData: { orderNo: 287, orderTypeId: 2, discAmount: 0, discPer: 0, serviceCharge: 0, levy: 0, vatExclAmount: 259.0909091, vatAmount: 25.9090909, netAmount: 285 },
  detailsData: [{ productId: 9, productName: "ABCd", qty: 3, price: 90.9090909, discPer: 0, discAmount: 13.6363636, serviceCharge: 0, levy: 0, vatValue: 10, vatAmount: 25.9090909, netAmount: 285, mapId: 1 }],
  modifiersData: null,
};
const menu276 = {
  masterData: { orderNo: 276, orderTypeId: 1, discAmount: 0, discPer: 0, serviceCharge: 0, levy: 0, vatExclAmount: 186.3636364, vatAmount: 18.6363636, netAmount: 205 },
  detailsData: [{ productId: 9, productName: "ABCd", qty: 2, price: 93.1818182, discPer: 0, discAmount: 0, serviceCharge: 0, levy: 0, vatValue: 10, vatAmount: 18.6363636, netAmount: 205, mapId: 1 }],
  modifiersData: [{ modifierName: "aa", mapId: 1, modifierId: 1, typeId: 3, qty: 1, price: 4.5454545, amount: 4.5454545, status: "Extras" }],
};

beforeEach(() => {
  localStorage.clear();
  // Current settings deliberately different from how the orders were saved
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
  localStorage.setItem("discCalc", "Inclusive");
});

/** Same steps as PosSplitModal.fetchOrderDetails + calculateBucketTotal. */
const loadSplit = (menuOrder: any, view: "Inclusive" | "Exclusive") => {
  localStorage.setItem("priceView", view);
  const data = applyStoredOrderView({ data: mergeStoredOrderSources(null, JSON.parse(JSON.stringify(menuOrder)))! }, view).data;
  const master = data.masterData;
  const orderTypeName = master.orderType || ORDER_TYPE_NAMES[Number(master.orderTypeId)] || "DineIn";
  const savedRates = deriveOrderChargeRatesFromMaster(data, view);
  const items = (data.detailsData || []).map((d: any) => {
    const pm = products.find((p) => p.id === d.productId)!;
    const pricing = storedLineToCartPricing(data, d, view, { productIsInclusive: pm.isIncl, discountCalc: "Inclusive", isBillDiscount: false });
    const mods = (data.modifiersData || []).filter((m: any) => m.mapId === d.mapId).map((m: any, k: number) =>
      Number(m.price) > 0 ? { ...m, price: pricing.extraGrossById.get(Number(m.modifierId)) ?? pricing.extraGrossList[k] } : m);
    return { mapId: d.mapId, productId: d.productId, qty: d.qty, price: pricing.price, isIncl: pricing.isIncl, discount: pricing.discount, vatValue: pricing.savedVatRate, mods };
  });
  const bucketTotal = (lines: { item: any; qty: number; discountValue: number; withExtras: boolean }[]) =>
    calculateOrder(
      lines.map(({ item, qty, discountValue, withExtras }) => ({
        uniqueId: String(item.mapId), productId: item.productId, quantity: qty, price: item.price, isIncl: item.isIncl,
        discountValue, discountType: item.discount?.type ?? "percentage",
        extras: withExtras ? item.mods.filter((m: any) => m.price > 0).map((m: any) => ({ id: m.modifierId, name: m.modifierName, price: m.price, qty: m.qty || 1, typeId: 2 })) : [],
        product: { id: item.productId, name: "x", price: item.price, categoryId: 0, vatValue: item.vatValue },
      })),
      { orderType: orderTypeName, config: getBillingConfigForOrder(orderTypeName, savedRates) }
    ).summary;
  return { items, orderTypeName, savedRates, bucketTotal };
};

for (const view of ["Inclusive", "Exclusive"] as const) {
  describe(`split (${view} data)`, () => {
    it("#287: move 1 of 3 → parts 190.000 + 95.000 = 285.000 (fixed discount shared by quantity)", () => {
      const { items, savedRates, orderTypeName, bucketTotal } = loadSplit(menu287, view);
      expect(orderTypeName).toBe("TakeOut");
      expect(savedRates).toEqual({ serviceCharge: 0, levy: 0 });
      const it0 = items[0];
      expect(it0.discount).toEqual({ type: "amount", value: 15 });
      const whole = bucketTotal([{ item: it0, qty: 3, discountValue: 15, withExtras: true }]);
      expect(whole.grandTotal).toBeCloseTo(285, 3);
      const base = bucketTotal([{ item: it0, qty: 2, discountValue: 10, withExtras: true }]);
      const part = bucketTotal([{ item: it0, qty: 1, discountValue: 5, withExtras: false }]);
      expect(base.grandTotal).toBeCloseTo(190, 3);
      expect(part.grandTotal).toBeCloseTo(95, 3);
      expect(base.serviceCharge + part.serviceCharge).toBe(0);
    });

    it("#276 (Dine-In saved with SC 0): extras priced right, no SC added although current SC is 10%", () => {
      const { items, savedRates, orderTypeName, bucketTotal } = loadSplit(menu276, view);
      expect(orderTypeName).toBe("DineIn");
      expect(savedRates).toEqual({ serviceCharge: 0, levy: 0 });
      expect(items[0].price).toBeCloseTo(100, 6);
      expect(items[0].mods[0].price).toBeCloseTo(5, 6); // extra back to its gross price
      const base = bucketTotal([{ item: items[0], qty: 1, discountValue: 0, withExtras: true }]);
      const part = bucketTotal([{ item: items[0], qty: 1, discountValue: 0, withExtras: false }]);
      expect(base.grandTotal).toBeCloseTo(105, 3);
      expect(part.grandTotal).toBeCloseTo(100, 3);
      expect(base.grandTotal + part.grandTotal).toBeCloseTo(205, 3);
    });
  });
}
