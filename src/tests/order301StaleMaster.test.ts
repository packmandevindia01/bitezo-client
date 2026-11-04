/**
 * Order #301 (real data): lines are correct, but the master serviceCharge / levy were left at their
 * pre-edit values by PUT /menu/order (16.135 / 8.874 instead of 24.006 / 13.204).
 * The POS must use the line totals.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { storedOrderCharges, storedOrderFooter, deriveOrderChargeRatesFromMaster } from "../features/pos/pricing";
import { buildPrintPricing } from "../features/pos/utils/printPricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import posReducer, { incrementItem, decrementItem } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";

const order301 = {
  masterData: { orderNo: 301, orderTypeId: 1, orderType: "DineIn", discAmount: 0, discPer: 0, serviceCharge: 16.1353798, levy: 8.8744589, vatExclAmount: 277.2727273, vatAmount: 27.7272727, netAmount: 305 },
  detailsData: [
    { productId: 9, productName: "ABCd", unitId: 1, qty: 2, price: 80.6768989, discPer: 0, discAmount: 0, serviceCharge: 16.1353798, levy: 8.8744589, vatId: 1, vatValue: 10, vatAmount: 18.6363636, netAmount: 205, mapId: 1 },
    { productId: 9, productName: "ABCd", unitId: 1, qty: 1, price: 78.7091696, discPer: 0, discAmount: 0, serviceCharge: 7.870917, levy: 4.3290043, vatId: 1, vatValue: 10, vatAmount: 9.0909091, netAmount: 100, mapId: 2 },
  ],
  modifiersData: [{ modifierName: "aa", mapId: 1, modifierId: 1, typeId: 3, qty: 1, price: 3.9354585, amount: 3.9354585, status: "Extras" }],
};
const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
});

describe("#301 stale master service charge / levy", () => {
  it("charges come from the lines: 24.006 / 13.204", () => {
    const c = storedOrderCharges(order301);
    expect(c.serviceCharge).toBeCloseTo(24.0062968, 6);
    expect(c.levy).toBeCloseTo(13.2034632, 6);
  });
  it("saved rates for edit are 10% / 5% (not 6.396% / 3.306%)", () => {
    expect(deriveOrderChargeRatesFromMaster(order301, "Exclusive")).toEqual({ serviceCharge: 10, levy: 5 });
  });
  it("footer: Sub Total 240.063, Charges 37.210, Net Value 277.273, VAT 27.727, Total 305.000", () => {
    const f = storedOrderFooter(order301, "Exclusive");
    expect(f.subTotal).toBeCloseTo(240.0632, 3);
    expect(f.charges).toBeCloseTo(37.2098, 3);
    expect(f.netValue).toBeCloseTo(277.2727273, 6);
    expect(f.netAmount).toBe(305);
  });
  it("print: service charge 24.006, levy 13.204, total 305.000", () => {
    const p = buildPrintPricing(order301, { dataView: "Exclusive", printPrice: "Inclusive", orderType: "DineIn", products: [ABCD] });
    expect(p.summary.serviceCharge).toBeCloseTo(24.0063, 3);
    expect(p.summary.levy).toBeCloseTo(13.2035, 3);
    expect(p.lines.map((l) => Math.round(l.getAmount(true) * 1000) / 1000)).toEqual([205, 100]);
  });
  it("edit + +/− keeps 205.000 / 100.000 = 305.000", () => {
    const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order301)) }, "Inclusive").data;
    const acts: any[] = [];
    loadSettledOrderIntoCart({ orderId: 301, orderData: data, dispatch: ((a: any) => { acts.push(a); return a; }) as any, products: [ABCD], productCache: { 9: ABCD }, showToast: () => {} });
    let s: any = posReducer(undefined, { type: "@@init" } as any);
    for (const a of acts) if (a?.type) s = posReducer(s, a);
    s = { ...s, productCache: { 9: ABCD } };
    expect(s.editingOrderRates).toEqual({ serviceCharge: 10, levy: 5 });
    const row2 = s.cartItems[1];
    s = posReducer(s, incrementItem({ uniqueId: row2.uniqueId }));
    s = posReducer(s, decrementItem({ uniqueId: row2.uniqueId }));
    const calc = selectCartCalculation({ pos: s } as any);
    expect(calc.lines.map((l: any) => Math.round(l.lineNetAmount * 1000) / 1000)).toEqual([205, 100]);
    expect(calc.summary.grandTotal).toBeCloseTo(305, 3);
    expect(calc.summary.serviceCharge).toBeCloseTo(24.0063, 3);
  });
});
