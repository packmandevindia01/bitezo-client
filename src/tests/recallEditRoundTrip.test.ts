/**
 * Recall-edit / settled-edit round trip with REAL backend orders:
 * saved order → (fetch layer view) → cart items → cart engine → totals must equal the stored totals.
 */
import { describe, it, expect } from "vitest";
import { mapOrderDetailsToCartItems } from "../features/pos/terminal/mappers/orderDetailToCartMapper";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";

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

const order283 = {
  masterData: { orderNo: 283, orderType: "DineIn", discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatExclAmount: 95.4545455, vatAmount: 9.5454545, netAmount: 105 },
  detailsData: [{ qty: 1, productId: 9, productName: "ABCd", price: 82.6446281, amount: 82.6446281, discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatAmount: 9.5454545, mapId: 1 }],
  modifiersData: [{ qty: 1, modifierId: 1, modifierName: "aa", typeName: "", price: 3.9354585, mapId: 1 }],
};
const order284 = {
  masterData: { orderNo: 284, orderType: "TakeOut", discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 9.0909091, vatAmount: 0.9090909, netAmount: 10 },
  detailsData: [{ qty: 1, productId: 6, productName: "Demo", price: 10, amount: 10, discAmount: 0.9090909, serviceCharge: 0, levy: 0, vatAmount: 0.9090909, mapId: 1 }],
  modifiersData: null,
};

const roundTrip = (order: any, view: "Inclusive" | "Exclusive", sc: number, levy: number) => {
  setConfig(sc, levy, view);
  const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order)) }, view).data;
  const orderType = data.masterData.orderType;
  const items = mapOrderDetailsToCartItems(data.detailsData, data.modifiersData || [], {
    products, productCache, priceView: view, orderType,
  });
  const calc = calculateOrder(items, { orderType, orderTypeId: orderType === "DineIn" ? 1 : 2, productCache });
  return { items, calc };
};

describe("recall → edit → cart totals equal stored totals", () => {
  for (const view of ["Inclusive", "Exclusive"] as const) {
    it(`#283 Dine-In + extra (${view} view)`, () => {
      const { calc } = roundTrip(order283, view, 10, 5);
      expect(calc.summary.grandTotal).toBeCloseTo(105, 3);
      expect(calc.summary.vatAmount).toBeCloseTo(9.5454545, 3);
      expect(calc.summary.serviceCharge).toBeCloseTo(8.2644628, 3);
    });
    it(`#284 item discount (${view} view)`, () => {
      const { calc } = roundTrip(order284, view, 0, 0);
      expect(calc.summary.grandTotal).toBeCloseTo(10, 3);
      expect(calc.summary.vatAmount).toBeCloseTo(0.9090909, 3);
    });
  }
});

const order285 = {
  masterData: { orderNo: 285, orderType: "TakeOut", discAmount: 30.2727273, serviceCharge: 0, levy: 0, vatExclAmount: 272.4545454, vatAmount: 27.2454545, netAmount: 299.7 },
  detailsData: [
    { qty: 3, productId: 9, productName: "ABCd", price: 90.9090909, amount: 272.7272727, discAmount: 27.2727273, serviceCharge: 0, levy: 0, vatAmount: 24.5454545, mapId: 1 },
    { qty: 3, productId: 6, productName: "Demo", price: 10, amount: 30, discAmount: 3, serviceCharge: 0, levy: 0, vatAmount: 2.7, mapId: 2 },
  ],
  modifiersData: null,
};

describe("recall-edit with bill discount (#285)", () => {
  it("OLD restore (amount = stored exclusive discAmount) changes the total when discCalc is Inclusive", () => {
    setConfig(0, 0, "Inclusive");
    const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order285)) }, "Inclusive").data;
    const items = mapOrderDetailsToCartItems(data.detailsData, [], { products, productCache, priceView: "Inclusive", orderType: "TakeOut", isOrderBillDiscount: true });
    const calc = calculateOrder(items, { orderType: "TakeOut", orderTypeId: 2, productCache, billDiscountValue: 30.2727273, billDiscountType: "amount" });
    expect(calc.summary.grandTotal).not.toBeCloseTo(299.7, 2);
  });
});

import { resolveRecalledBillDiscount } from "../features/pos/services/storedOrderView";

describe("recall-edit with bill discount — FIXED restore", () => {
  const recall285 = (view: "Inclusive" | "Exclusive", discCalc: "Inclusive" | "Exclusive") => {
    setConfig(0, 0, view);
    localStorage.setItem("discCalc", discCalc);
    const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order285)) }, view).data;
    const items = mapOrderDetailsToCartItems(data.detailsData, [], { products, productCache, priceView: view, orderType: "TakeOut", isOrderBillDiscount: true });
    // legacy recall restore for order_data (no discPer): amount = master discAmount
    const bill = resolveRecalledBillDiscount(data, 30.2727273, "amount");
    return { items, bill };
  };

  for (const view of ["Inclusive", "Exclusive"] as const) {
    for (const discCalc of ["Inclusive", "Exclusive"] as const) {
      it(`#285 restores 10% and reproduces 299.700 (view ${view}, discCalc ${discCalc})`, () => {
        const { items, bill } = recall285(view, discCalc);
        expect(bill).toEqual({ billDiscountValue: 10, billDiscountType: "percentage" });
        const calc = calculateOrder(items, { orderType: "TakeOut", orderTypeId: 2, productCache, billDiscountValue: bill.billDiscountValue, billDiscountType: bill.billDiscountType });
        expect(calc.summary.grandTotal).toBeCloseTo(299.7, 3);
        expect(calc.summary.totalDiscount).toBeCloseTo(30.2727273, 3);
      });
    }
  }

  it("#285 edit: add one more Demo → 10% bill discount also applies to it", () => {
    const { items, bill } = recall285("Inclusive", "Inclusive");
    const demo = items.find((i: any) => i.productId === 6)!;
    demo.quantity = 4;
    const calc = calculateOrder(items, { orderType: "TakeOut", orderTypeId: 2, productCache, billDiscountValue: bill.billDiscountValue, billDiscountType: bill.billDiscountType });
    // (272.727 + 40) × 0.9 × 1.1 = 309.6
    expect(calc.summary.grandTotal).toBeCloseTo(309.6, 3);
  });

  it("uneven fixed bill discount is restored as an amount that reproduces the stored exclusive discount", () => {
    setConfig(0, 0, "Exclusive");
    localStorage.setItem("discCalc", "Inclusive");
    const order = {
      masterData: { orderType: "TakeOut", discAmount: 5 },
      detailsData: [
        { qty: 1, productId: 6, price: 10, amount: 10, discAmount: 4, serviceCharge: 0, levy: 0, vatAmount: 0.6, mapId: 1 },
        { qty: 1, productId: 6, price: 10, amount: 10, discAmount: 1, serviceCharge: 0, levy: 0, vatAmount: 0.9, mapId: 2 },
      ],
      modifiersData: null,
    };
    const bill = resolveRecalledBillDiscount(order, 5, "amount");
    expect(bill.billDiscountType).toBe("amount");
    expect(bill.billDiscountValue).toBeCloseTo(5.5, 6); // 5 exclusive × 1.1 because discCalc is Inclusive
  });
});
