/**
 * Order #288 (real data): edited order whose line VAT was stored ROUNDED to 3 decimals
 * (0.262 instead of 0.2616144) by the old update path. The recall screen showed 5.001 instead of 5.000.
 *  1. Conversions must not be thrown off by rounded stored line amounts.
 *  2. The update path must keep 7-decimal line values (no re-sanitizing).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mergeStoredOrderSources, toInclusiveView, buildFallbackRates, storedLineRates, storedOrderFooter } from "../features/pos/pricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { buildPrintPricing } from "../features/pos/utils/printPricing";

vi.mock("../api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import axiosInstance from "../api/axiosInstance";
import { orderApi } from "../features/pos/services/orderApi";

const recall288 = {
  masterData: { orderNo: 288, ticketNo: 288, orderType: "TakeOut", waiter: "emp1", deliveryCharge: 0, discAmount: 22.7272727, serviceCharge: 0, levy: 0, vatExclAmount: 30.8181818, vatAmount: 3.0818181, netAmount: 33.9 },
  detailsData: [
    { qty: 4, productId: 6, productName: "Demo", price: 10, amount: 40, discAmount: 16.9779286, serviceCharge: 0, levy: 0, vatAmount: 2.302, mapId: 1 },
    { qty: 3, productId: 2, productName: "def", price: 3, amount: 9, discAmount: 3.820034, serviceCharge: 0, levy: 0, vatAmount: 0.518, mapId: 2 },
    { qty: 1, productId: 5, productName: "sndndksdkkslnasklns", price: 4.5454545, amount: 4.5454545, discAmount: 1.9293101, serviceCharge: 0, levy: 0, vatAmount: 0.262, mapId: 3 },
  ],
  modifiersData: null,
};
const menu288 = {
  masterData: { orderNo: 288, orderTypeId: 2, discAmount: 22.7272727, discPer: 0, serviceCharge: 0, levy: 0, vatExclAmount: 30.8181818, vatAmount: 3.0818181, netAmount: 33.9 },
  detailsData: [
    { productId: 6, qty: 4, price: 10, discPer: 42.44, discAmount: 16.9779286, vatId: 1, vatValue: 10, vatAmount: 2.302, netAmount: 25.324, mapId: 1 },
    { productId: 2, qty: 3, price: 3, discPer: 42.44, discAmount: 3.820034, vatId: 1, vatValue: 10, vatAmount: 0.518, netAmount: 5.698, mapId: 2 },
    { productId: 5, qty: 1, price: 4.5454545, discPer: 42.44, discAmount: 1.9293101, vatId: 1, vatValue: 10, vatAmount: 0.262, netAmount: 2.878, mapId: 3 },
  ],
  modifiersData: null,
};

const NO_FALLBACK = buildFallbackRates({ serviceCharge: 0, levy: 0, vat: 0 });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
});

describe("#288 rounded stored line VAT", () => {
  it("the line's rate is 10% (not 10.015%) — with and without the stored vatValue", () => {
    expect(storedLineRates(recall288, recall288.detailsData[2], "Exclusive").vat).toBe(10);
    const merged = mergeStoredOrderSources(recall288, menu288)!;
    expect(storedLineRates(merged, merged.detailsData![2], "Exclusive").vat).toBe(10);
  });

  for (const source of ["recall only", "recall + menu"] as const) {
    it(`recall screen rows (Inclusive): 11.000 / 3.300 / 5.000 — ${source}`, () => {
      const data = source === "recall only" ? recall288 : mergeStoredOrderSources(recall288, menu288)!;
      const v = toInclusiveView(JSON.parse(JSON.stringify(data)), NO_FALLBACK);
      expect(v.detailsData![0].price.toFixed(3)).toBe("11.000");
      expect(v.detailsData![1].price.toFixed(3)).toBe("3.300");
      expect(v.detailsData![2].price.toFixed(3)).toBe("5.000");
    });
  }

  it("footer stays as stored", () => {
    const f = storedOrderFooter(recall288, "Exclusive");
    expect(f.subTotal.toFixed(3)).toBe("53.545");
    expect(f.discount.toFixed(3)).toBe("22.727");
    expect(f.netAmount).toBe(33.9);
  });

  for (const printPrice of ["Inclusive", "Exclusive"] as const) {
    it(`print (${printPrice}) shows 5.000 / 4.545 for the open-price item`, () => {
      localStorage.setItem("printPrice", printPrice);
      const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(recall288)) }, "Inclusive").data;
      const p = buildPrintPricing(data, { dataView: "Inclusive", printPrice, orderType: "TakeOut" });
      expect(p.lines[2].getRate(printPrice === "Inclusive").toFixed(3)).toBe(printPrice === "Inclusive" ? "5.000" : "4.545");
    });
  }
});

describe("update path keeps 7-decimal line values", () => {
  it("orderApi.updateOrder does not round line VAT / netAmount", async () => {
    (axiosInstance.put as any).mockResolvedValue({ data: { isSuccess: true } });
    await orderApi.updateOrder(288, {
      orderId: 288, details: [
        { productId: 5, unitId: 1, qty: 1, price: 4.5454545, discPer: 42.44, discAmount: 1.9293101, serviceCharge: 0, levy: 0, vatId: 1, vatAmount: 0.2616144, netAmount: 2.8777588, mapId: 3, complimentaryStatus: false },
      ],
      modifiers: [], discAmount: 1.9293101, serviceCharge: 0, levy: 0, vatExclAmount: 2.6161444, vatAmount: 0.2616144, netAmount: 2.8777588,
    } as any);
    const sent = (axiosInstance.put as any).mock.calls[0][1];
    expect(sent.details[0].vatAmount).toBe(0.2616144);
    expect(sent.details[0].netAmount).toBe(2.8777588);
    expect(sent.details[0].price).toBe(4.5454545);
  });
});

import { storedLineToCartPricing } from "../features/pos/pricing";
describe("#288 discPer is rounded (42.44) — restore the exact stored discount instead", () => {
  it("line 3 restores an amount discount reproducing 1.9293101 exclusive (not 42.44%)", () => {
    const merged = mergeStoredOrderSources(recall288, menu288)!;
    const p = storedLineToCartPricing(merged, merged.detailsData![2], "Exclusive", { productIsInclusive: true, discountCalc: "Exclusive", isBillDiscount: false });
    expect(p.discount).toEqual({ type: "amount", value: 1.9293101 });
  });
  it("an exact discPer (10%) is still restored as a percentage", () => {
    const d = { qty: 1, price: 30, amount: 30, discAmount: 3, discPer: 10, serviceCharge: 0, levy: 0, vatAmount: 2.7, mapId: 1 };
    const order = { masterData: { vatExclAmount: 27, vatAmount: 2.7, netAmount: 29.7, serviceCharge: 0, levy: 0 }, detailsData: [d] };
    expect(storedLineToCartPricing(order, d, "Exclusive", { productIsInclusive: false, discountCalc: "Exclusive", isBillDiscount: false }).discount).toEqual({ type: "percentage", value: 10 });
  });
});
