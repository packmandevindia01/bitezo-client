/**
 * Order #297 (real data): Dine-In, SC 10%, levy 0, VAT 10%, bill discount 25.000 inclusive.
 * Guest print / settle must show the stored values.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildPrintPricing } from "../features/pos/utils/printPricing";
import { applyStoredOrderView, } from "../features/pos/services/storedOrderView";
import { mergeStoredOrderSources, storedOrderFooter } from "../features/pos/pricing";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

const recall297 = {
  masterData: { orderNo: 297, ticketNo: 297, orderType: "DineIn", waiter: "emp1", sectionName: "upper", tableNo: "T2", deliveryCharge: 0, discAmount: 20.661157, serviceCharge: 7.446281, levy: 0, vatExclAmount: 81.909091, vatAmount: 8.190909, netAmount: 90.1 },
  detailsData: [
    { qty: 1, productId: 9, productName: "ABCd", price: 82.6446281, amount: 82.6446281, discAmount: 17.9506143, serviceCharge: 6.4694014, levy: 0, vatAmount: 7.1163415, mapId: 1 },
    { qty: 1, productId: 6, productName: "Demo", price: 10, amount: 10, discAmount: 2.1720243, serviceCharge: 0.7827976, levy: 0, vatAmount: 0.8610773, mapId: 2 },
    { qty: 1, productId: 1, productName: "abcd", price: 2.4793388, amount: 2.4793388, discAmount: 0.5385184, serviceCharge: 0.194082, levy: 0, vatAmount: 0.2134902, mapId: 3 },
  ],
  modifiersData: null,
};
const menu297 = {
  masterData: { orderNo: 297, orderTypeId: 1, discAmount: 20.661157, discPer: 0, serviceCharge: 7.446281, levy: 0, vatExclAmount: 81.909091, vatAmount: 8.190909, netAmount: 90.1, updatedAt: "2026-11-03T16:38:06.586+05:30" },
  detailsData: [
    { productId: 9, qty: 1, price: 82.6446281, discPer: 21.72, discAmount: 17.9506143, serviceCharge: 6.4694014, levy: 0, vatValue: 10, vatAmount: 7.1163415, netAmount: 78.2797567, mapId: 1 },
    { productId: 6, qty: 1, price: 10, discPer: 21.72, discAmount: 2.1720243, serviceCharge: 0.7827976, levy: 0, vatValue: 10, vatAmount: 0.8610773, netAmount: 9.4718506, mapId: 2 },
    { productId: 1, qty: 1, price: 2.4793388, discPer: 21.72, discAmount: 0.5385184, serviceCharge: 0.194082, levy: 0, vatValue: 10, vatAmount: 0.2134902, netAmount: 2.3483927, mapId: 3 },
  ],
  modifiersData: null,
};
const products = [
  { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true },
  { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false },
  { id: 1, name: "abcd", price: 3, vatValue: 10, isIncl: true },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } })); // current settings differ
  localStorage.setItem("decimalPart", "3");
});

describe("#297 Dine-In with bill discount", () => {
  it("footer = stored: Sub Total 95.124, Discount 20.661, SC 7.446, Net 81.909, VAT 8.191, Total 90.100", () => {
    const data = mergeStoredOrderSources(recall297, menu297)!;
    const f = storedOrderFooter(data, "Exclusive");
    expect(f.subTotal).toBeCloseTo(95.1239669, 5);
    expect(f.discount).toBeCloseTo(20.661157, 6);
    expect(f.charges).toBeCloseTo(7.446281, 6);
    expect(f.netValue).toBeCloseTo(81.909091, 6);
    expect(f.vatAmount).toBeCloseTo(8.190909, 6);
    expect(f.netAmount).toBe(90.1);
  });

  for (const printPrice of ["Inclusive", "Exclusive"] as const) {
    it(`guest print (${printPrice}): rows before discount, footer = stored, total 90.100`, async () => {
      localStorage.setItem("printPrice", printPrice);
      const data = applyStoredOrderView({ data: mergeStoredOrderSources(recall297, menu297)! }, "Inclusive").data;
      const p = buildPrintPricing(data, { dataView: "Inclusive", printPrice, orderType: "DineIn", products });
      const incl = printPrice === "Inclusive";
      expect(p.lines.map((l) => Math.round(l.getAmount(incl) * 1000) / 1000)).toEqual(incl ? [100, 12.1, 3] : [82.645, 10, 2.479]);
      expect(p.lines.every((l) => l.getDiscount(incl) === 0)).toBe(true); // bill discount only in the footer
      const html = await generateGuestPrintHtml(p as any, {
        orderNo: "297", ticketNo: "297", waiter: "emp1", counter: "C1", orderType: "DineIn", section: "upper", table: "T2",
        subTotal: 0, vatAmount: 8.190909, netAmount: 90.1, printPrice, showCompanyHeader: false,
      });
      for (const v of ["95.124", "20.661", "7.446", "81.909", "8.191", "90.100"]) expect(html).toContain(v);
    });
  }
});
