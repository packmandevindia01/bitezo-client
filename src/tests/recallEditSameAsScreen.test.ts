/**
 * RULE: whatever the recall / settled screen shows must be exactly what the cart shows on Edit.
 * Real backend orders 283 / 284 / 285, both price views.
 */
import { describe, it, expect } from "vitest";
import { storedOrderFooter } from "../features/pos/pricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import { buildPrintPricing } from "../features/pos/utils/printPricing";

const setConfig = (sc: number, levy: number, view: "Inclusive" | "Exclusive") => {
  localStorage.clear();
  localStorage.setItem("enableVat", "true");
  localStorage.setItem("priceView", view);
  localStorage.setItem("printPrice", view);
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { discountCalc: "Inclusive", priceView: view, serviceCharges: sc, levy, vatStatus: true } }));
};

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };
const products = [ABCD, DEMO];
const productCache = { 9: ABCD, 6: DEMO };

const ORDERS: Record<string, { sc: number; levy: number; data: any; footer: Record<string, number> }> = {
  "283": {
    sc: 10, levy: 5,
    data: {
      masterData: { orderNo: 283, orderType: "DineIn", discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatExclAmount: 95.4545455, vatAmount: 9.5454545, netAmount: 105 },
      detailsData: [{ qty: 1, productId: 9, productName: "ABCd", price: 82.6446281, amount: 82.6446281, discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatAmount: 9.5454545, mapId: 1 }],
      modifiersData: [{ qty: 1, modifierId: 1, modifierName: "aa", price: 3.9354585, mapId: 1 }],
    },
    footer: { subTotal: 82.6446282, discount: 0, charges: 12.8099173, netValue: 95.4545455, vatAmount: 9.5454545, netAmount: 105 },
  },
  "284": {
    sc: 0, levy: 0,
    data: {
      masterData: { orderNo: 284, orderType: "TakeOut", discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 9.0909091, vatAmount: 0.9090909, netAmount: 10 },
      detailsData: [{ qty: 1, productId: 6, productName: "Demo", price: 10, amount: 10, discAmount: 0.9090909, serviceCharge: 0, levy: 0, vatAmount: 0.9090909, mapId: 1 }],
      modifiersData: null,
    },
    footer: { subTotal: 10, discount: 0.9090909, charges: 0, netValue: 9.0909091, vatAmount: 0.9090909, netAmount: 10 },
  },
  "285 (settled, discPer 10)": {
    sc: 0, levy: 0,
    data: {
      masterData: { orderNo: 285, orderType: "TakeOut", discAmount: 30.2727273, discPer: 10, serviceCharge: 0, levy: 0, vatExclAmount: 272.4545454, vatAmount: 27.2454545, netAmount: 299.7 },
      detailsData: [
        { qty: 3, productId: 9, productName: "ABCd", price: 90.9090909, amount: 272.7272727, discAmount: 27.2727273, serviceCharge: 0, levy: 0, vatAmount: 24.5454545, mapId: 1 },
        { qty: 3, productId: 6, productName: "Demo", price: 10, amount: 30, discAmount: 3, serviceCharge: 0, levy: 0, vatAmount: 2.7, mapId: 2 },
      ],
      modifiersData: null,
    },
    footer: { subTotal: 302.7272727, discount: 30.2727273, charges: 0, netValue: 272.4545454, vatAmount: 27.2454545, netAmount: 299.7 },
  },
};

describe("recall/settled screen footer = edit cart footer", () => {
  for (const [name, o] of Object.entries(ORDERS)) {
    for (const view of ["Inclusive", "Exclusive"] as const) {
      it(`#${name} — ${view} view`, () => {
        setConfig(o.sc, o.levy, view);
        const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(o.data)) }, view).data;

        // What the screen shows
        const screen = storedOrderFooter(data, view);
        for (const [k, v] of Object.entries(o.footer)) expect((screen as any)[k]).toBeCloseTo(v, 5);

        // What the cart shows after pressing Edit
        let action: any = null;
        loadSettledOrderIntoCart({ orderId: 1, orderData: data, dispatch: ((a: any) => (action = a)) as any, products, productCache, showToast: () => {} });
        const p = action.payload;
        expect(p.authoritativeSubtotal).toBeCloseTo(screen.subTotal, 5);
        expect(p.authoritativeDiscount).toBeCloseTo(screen.discount, 5);
        expect(p.authoritativeCharges).toBeCloseTo(screen.charges, 5);
        expect(p.authoritativeNetValue).toBeCloseTo(screen.netValue, 5);
        expect(p.authoritativeTax).toBeCloseTo(screen.vatAmount, 5);
        expect(p.authoritativeNetAmount).toBeCloseTo(screen.netAmount, 5);

        // Lines: edit cart rows = screen rows
        const unified = buildPrintPricing(data, { dataView: view, printPrice: view, orderType: data.masterData.orderType, products, productCache });
        const isIncl = view === "Inclusive";
        // Lines add up to the footer: the saved order is the truth (order 285 was shown 3 x 82.645 before).
        const linesSum = p.cartItems.reduce((sum: number, item: any) => sum + item.authoritativeOriginalLineTotal, 0);
        if (view === "Exclusive") expect(linesSum).toBeCloseTo(o.footer.subTotal, 3);
        p.cartItems.forEach((item: any, i: number) => {
          const row = unified.lines[i];
          expect(item.authoritativePrice).toBeCloseTo(row.getRate(isIncl), 3);
          expect(item.authoritativeLineTotal).toBeCloseTo(row.getAmount(isIncl, unified.summary.isBillDiscount), 3);
        });
      });
    }
  }

  it("footer does not depend on the price view (same money in both views)", () => {
    for (const o of Object.values(ORDERS)) {
      setConfig(o.sc, o.levy, "Inclusive");
      const incl = storedOrderFooter(applyStoredOrderView({ data: o.data }, "Inclusive").data, "Inclusive");
      const excl = storedOrderFooter(applyStoredOrderView({ data: o.data }, "Exclusive").data, "Exclusive");
      for (const k of Object.keys(o.footer)) expect((incl as any)[k]).toBeCloseTo((excl as any)[k], 6);
    }
  });
});
