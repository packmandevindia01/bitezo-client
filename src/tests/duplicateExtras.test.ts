/**
 * Order #301 (real case): the backend returned the extra "aa" TWICE in modifiersData.
 * The extra must be counted once: ABCD price 100.000 (not 97.500), and +/− must keep 205.000.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import posReducer, { addToCart, incrementItem, decrementItem } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";
import { dedupeModifierRows, mergeStoredOrderSources } from "../features/pos/pricing";
import { buildPrintPricing } from "../features/pos/utils/printPricing";

const ABCD = { id: 9, name: "ABCD", price: 100, vatValue: 10, isIncl: true };
const f = 1.2705; // Dine-In SC 10% × levy 5% × VAT 10%
const base = 205 / f, ex = 5 / f, sc = base * 0.1, levy = (base + sc) * 0.05, vat = (base + sc + levy) * 0.1;
const extraRow = { qty: 1, modifierId: 1, modifierName: "aa", price: ex, amount: ex, typeId: 2, status: "Extras", mapId: 1 };
const order301 = {
  masterData: { orderNo: 301, orderType: "DineIn", orderTypeId: 1, discAmount: 0, serviceCharge: sc, levy, vatExclAmount: base + sc + levy, vatAmount: vat, netAmount: 205 },
  detailsData: [{ qty: 2, productId: 9, productName: "ABCD", price: base / 2, amount: base, discAmount: 0, serviceCharge: sc, levy, vatAmount: vat, vatValue: 10, mapId: 1 }],
  modifiersData: [extraRow, { ...extraRow }], // ← duplicate from the backend
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
});

describe("duplicate extra rows from the backend", () => {
  it("dedupeModifierRows keeps one row per line + extra", () => {
    expect(dedupeModifierRows(order301.modifiersData)).toHaveLength(1);
    expect(mergeStoredOrderSources(order301, null)!.modifiersData).toHaveLength(1);
  });

  it("edit: ABCD price 100.000 (not 97.500); +/− keeps 205.000", () => {
    const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order301)) }, "Inclusive").data;
    const acts: any[] = [];
    loadSettledOrderIntoCart({ orderId: 301, orderData: data, dispatch: ((a: any) => { acts.push(a); return a; }) as any, products: [ABCD], productCache: { 9: ABCD }, showToast: () => {} });
    let s: any = posReducer(undefined, { type: "@@init" } as any);
    for (const a of acts) if (a?.type) s = posReducer(s, a);
    s = { ...s, productCache: { 9: ABCD } };
    const row = s.cartItems[0];
    expect(row.price).toBeCloseTo(100, 6);
    expect(row.extras).toHaveLength(1);
    s = posReducer(s, addToCart({ uniqueId: "new", productId: 9, price: 100, isIncl: true, quantity: 1 } as any));
    expect(selectCartCalculation({ pos: s } as any).summary.grandTotal).toBeCloseTo(305, 3);
    s = posReducer(s, incrementItem({ uniqueId: "new" }));
    s = posReducer(s, decrementItem({ uniqueId: "new" }));
    s = posReducer(s, incrementItem({ uniqueId: row.uniqueId }));
    s = posReducer(s, decrementItem({ uniqueId: row.uniqueId }));
    const calc = selectCartCalculation({ pos: s } as any);
    expect(calc.lines[0].lineNetAmount).toBeCloseTo(205, 3);
    expect(calc.summary.grandTotal).toBeCloseTo(305, 3);
  });

  it("print counts the extra once", () => {
    const p = buildPrintPricing(order301, { dataView: "Exclusive", printPrice: "Inclusive", orderType: "DineIn", products: [ABCD] });
    expect(p.lines[0].getAmount(true)).toBeCloseTo(205, 4);
  });
});
