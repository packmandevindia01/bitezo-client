/**
 * Real backend responses (orders 283, 284, 285): converting the Exclusive response in the
 * frontend must give exactly what the backend returns for priceView=Inclusive.
 */
import { describe, it, expect } from "vitest";
import { toInclusiveView, deriveStoredLineRates, buildFallbackRates } from "../features/pos/pricing";

const NO_FALLBACK = buildFallbackRates({ serviceCharge: 0, levy: 0, vat: 0 });

const order283Excl = {
  masterData: { orderNo: 283, orderType: "DineIn", discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatExclAmount: 95.4545455, vatAmount: 9.5454545, netAmount: 105 },
  detailsData: [{ qty: 1, productId: 9, productName: "ABCd", price: 82.6446281, amount: 82.6446281, discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatAmount: 9.5454545, mapId: 1 }],
  modifiersData: [{ qty: 1, modifierId: 1, modifierName: "aa", price: 3.9354585, mapId: 1 }],
};
const order284Excl = {
  masterData: { orderNo: 284, orderType: "TakeOut", discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 9.0909091, vatAmount: 0.9090909, netAmount: 10 },
  detailsData: [{ qty: 1, productId: 6, productName: "Demo", price: 10, amount: 10, discAmount: 0.9090909, serviceCharge: 0, levy: 0, vatAmount: 0.9090909, mapId: 1 }],
  modifiersData: null,
};
const order285Excl = {
  masterData: { orderNo: 285, orderType: "TakeOut", discAmount: 30.2727273, serviceCharge: 0, levy: 0, vatExclAmount: 272.4545454, vatAmount: 27.2454545, netAmount: 299.7 },
  detailsData: [
    { qty: 3, productId: 9, productName: "ABCd", price: 90.9090909, amount: 272.7272727, discAmount: 27.2727273, serviceCharge: 0, levy: 0, vatAmount: 24.5454545, mapId: 1 },
    { qty: 3, productId: 6, productName: "Demo", price: 10, amount: 30, discAmount: 3, serviceCharge: 0, levy: 0, vatAmount: 2.7, mapId: 2 },
  ],
  modifiersData: null,
};

describe("saved order rates are derived from stored amounts", () => {
  it("283 Dine-In: SC 10%, levy 5%, VAT 10%", () => {
    expect(deriveStoredLineRates(order283Excl.detailsData[0])).toMatchObject({ serviceCharge: 10, levy: 5, vat: 10 });
  });
  it("285 TakeOut: no SC, no levy, VAT 10% (discounted line)", () => {
    expect(deriveStoredLineRates(order285Excl.detailsData[0])).toMatchObject({ serviceCharge: 0, levy: 0, vat: 10 });
  });
  it("100% discounted line cannot be derived", () => {
    expect(deriveStoredLineRates({ amount: 10, discAmount: 10, vatAmount: 0 })).toBeNull();
  });
});

describe("Exclusive → Inclusive conversion matches the backend's Inclusive response", () => {
  it("order 283 (backend Inclusive: price 105.00000000105, modifier 5.00000002425)", () => {
    const v = toInclusiveView(order283Excl, NO_FALLBACK);
    expect(v.detailsData[0].price).toBeCloseTo(105.00000000105, 8);
    expect(v.detailsData[0].amount).toBeCloseTo(105.00000000105, 8);
    expect(v.modifiersData![0].price).toBeCloseTo(5.00000002425, 8);
    // stored charges and master are view-independent
    expect(v.detailsData[0].serviceCharge).toBe(8.2644628);
    expect(v.masterData).toEqual(order283Excl.masterData);
  });

  it("order 284 (backend Inclusive: price 11, discAmount 0.99999999)", () => {
    const v = toInclusiveView(order284Excl, NO_FALLBACK);
    expect(v.detailsData[0].price).toBeCloseTo(11, 8);
    expect(v.detailsData[0].discAmount).toBeCloseTo(0.99999999, 8);
  });

  it("order 285 (backend Inclusive: 99.99999999 / 299.99999997 / 30.00000003 and 11 / 33 / 3.3)", () => {
    const v = toInclusiveView(order285Excl, NO_FALLBACK);
    const [a, b] = v.detailsData;
    expect(a.price).toBeCloseTo(99.99999999, 8);
    expect(a.amount).toBeCloseTo(299.99999997, 8);
    expect(a.discAmount).toBeCloseTo(30.00000003, 8);
    expect(b.price).toBeCloseTo(11, 8);
    expect(b.amount).toBeCloseTo(33, 8);
    expect(b.discAmount).toBeCloseTo(3.3, 8);
  });

  it("does NOT depend on current settings: a Dine-In order converts with its own SC even if the POS now has SC 0", () => {
    // The old fetch passed serviceCharge=0 for orders it treated as TakeOut → price would be 82.64×1.155 = 95.45 (wrong)
    const v = toInclusiveView(order283Excl, NO_FALLBACK);
    expect(v.detailsData[0].price).not.toBeCloseTo(95.4545, 2);
    expect(v.detailsData[0].price).toBeCloseTo(105, 6);
  });

  it("100%-discounted line uses the other lines' rates, then the fallback", () => {
    const order = {
      detailsData: [
        { qty: 1, price: 10, amount: 10, discAmount: 10, serviceCharge: 0, levy: 0, vatAmount: 0, mapId: 1 },
        { qty: 1, price: 10, amount: 10, discAmount: 0, serviceCharge: 0, levy: 0, vatAmount: 1, mapId: 2 },
      ],
      modifiersData: null,
    };
    expect(toInclusiveView(order, NO_FALLBACK).detailsData[0].price).toBeCloseTo(11, 8);
    const alone = { detailsData: [order.detailsData[0]], modifiersData: null };
    expect(toInclusiveView(alone, buildFallbackRates({ serviceCharge: 0, levy: 5, vat: 10 })).detailsData[0].price).toBeCloseTo(11.55, 8);
  });
});
