/**
 * Prints follow the PRINT PRICE setting and use the stored order values (real order #283 / #285 / #287),
 * never the current settings.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildPrintPricing } from "../features/pos/utils/printPricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

const order283 = {
  masterData: { orderNo: 283, ticketNo: 283, orderType: "DineIn", discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatExclAmount: 95.4545455, vatAmount: 9.5454545, netAmount: 105 },
  detailsData: [{ qty: 1, productId: 9, productName: "ABCd", price: 82.6446281, amount: 82.6446281, discAmount: 0, serviceCharge: 8.2644628, levy: 4.5454545, vatAmount: 9.5454545, mapId: 1 }],
  modifiersData: [{ qty: 1, modifierId: 1, modifierName: "aa", price: 3.9354585, mapId: 1 }],
};
const order285 = {
  masterData: { orderNo: 285, ticketNo: 285, orderType: "TakeOut", discAmount: 30.2727273, discPer: 10, serviceCharge: 0, levy: 0, vatExclAmount: 272.4545454, vatAmount: 27.2454545, netAmount: 299.7 },
  detailsData: [
    { qty: 3, productId: 9, productName: "ABCd", price: 90.9090909, amount: 272.7272727, discAmount: 27.2727273, serviceCharge: 0, levy: 0, vatAmount: 24.5454545, mapId: 1 },
    { qty: 3, productId: 6, productName: "Demo", price: 10, amount: 30, discAmount: 3, serviceCharge: 0, levy: 0, vatAmount: 2.7, mapId: 2 },
  ],
  modifiersData: null,
};
const order287 = {
  masterData: { orderNo: 287, ticketNo: 287, orderType: "TakeOut", discAmount: 0, serviceCharge: 0, levy: 0, vatExclAmount: 259.0909091, vatAmount: 25.9090909, netAmount: 285 },
  detailsData: [{ qty: 3, productId: 9, productName: "ABCd", price: 90.9090909, amount: 272.7272727, discAmount: 13.6363636, serviceCharge: 0, levy: 0, vatAmount: 25.9090909, mapId: 1 }],
  modifiersData: null,
};

const products = [{ id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true }, { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false }];

beforeEach(() => {
  localStorage.clear();
  // Current settings deliberately DIFFERENT from how the orders were saved
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
  localStorage.setItem("decimalPart", "3");
});

const pricingFor = (order: any, dataView: "Inclusive" | "Exclusive", printPrice: "Inclusive" | "Exclusive") => {
  localStorage.setItem("printPrice", printPrice);
  const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order)) }, dataView).data;
  return buildPrintPricing(data, { dataView, printPrice, orderType: order.masterData.orderType, products });
};

const VIEWS = ["Inclusive", "Exclusive"] as const;

describe("print rows follow Print Price, whatever view the data was fetched in", () => {
  for (const dataView of VIEWS) {
    it(`#283 (data ${dataView}) — Inclusive print: 105.000 / Exclusive print: 82.645`, () => {
      const incl = pricingFor(order283, dataView, "Inclusive");
      expect(incl.lines[0].getRate(true)).toBeCloseTo(105, 6);
      expect(incl.lines[0].getAmount(true)).toBeCloseTo(105, 6);
      const excl = pricingFor(order283, dataView, "Exclusive");
      expect(excl.lines[0].getRate(false)).toBeCloseTo(82.6446281, 6);
      expect(excl.summary.serviceCharge).toBeCloseTo(8.2644628, 6);
      expect(excl.summary.levy).toBeCloseTo(4.5454545, 6);
      expect(excl.summary.vatAmount).toBeCloseTo(9.5454545, 6);
      expect(excl.summary.grandTotal).toBe(105);
      expect(excl.summary.netValue).toBeCloseTo(95.4545455, 6);
    });

    it(`#285 bill discount (data ${dataView}) — rows before discount, discount in footer`, () => {
      const p = pricingFor(order285, dataView, "Inclusive");
      expect(p.summary.isBillDiscount).toBe(true);
      expect(p.lines[0].getRate(true)).toBeCloseTo(100, 6);
      expect(p.lines[0].getAmount(true)).toBeCloseTo(300, 6);
      expect(p.lines[1].getAmount(true)).toBeCloseTo(33, 6);
      expect(p.summary.subTotalInclusive).toBeCloseTo(333, 6);
      expect(p.summary.totalDiscountIncl).toBeCloseTo(33.3, 6);
      expect(p.summary.grandTotal).toBe(299.7);
    });

    it(`#287 item discount (data ${dataView}) — Inclusive print row: 300.000 − 15.000 = 285.000`, () => {
      const p = pricingFor(order287, dataView, "Inclusive");
      expect(p.lines[0].getRate(true)).toBeCloseTo(100, 6);
      expect(p.lines[0].getDiscount(true)).toBeCloseTo(15, 6);
      expect(p.lines[0].getAmount(true, false)).toBeCloseTo(285, 6);
    });
  }
});

describe("rendered guest bill shows the right numbers", () => {
  const render = async (order: any, dataView: "Inclusive" | "Exclusive", printPrice: "Inclusive" | "Exclusive") => {
    const pricing = pricingFor(order, dataView, printPrice);
    const m = order.masterData;
    return generateGuestPrintHtml(pricing as any, {
      orderNo: String(m.orderNo), ticketNo: String(m.ticketNo), waiter: "emp1", counter: "C1", orderType: m.orderType,
      subTotal: 0, vatAmount: m.vatAmount, netAmount: m.netAmount, printPrice, showCompanyHeader: false,
    });
  };
  const has = (html: string, v: string) => html.includes(`>${v}<`) || new RegExp(`>\\s*${v.replace(".", "\\.")}\\s*<`).test(html);

  for (const dataView of VIEWS) {
    it(`#283 Inclusive bill (data ${dataView}) prints 105.000 row, VAT 9.545, total 105.000`, async () => {
      const html = await render(order283, dataView, "Inclusive");
      expect(has(html, "105.000")).toBe(true);
      expect(has(html, "9.545")).toBe(true);
      expect(html).not.toMatch(/>\s*95\.4\d\d\s*<.*rate/i);
    });
    it(`#283 Exclusive bill (data ${dataView}) prints 82.645 row, charges 12.810, net value 95.455, total 105.000`, async () => {
      const html = await render(order283, dataView, "Exclusive");
      expect(has(html, "82.645")).toBe(true);
      expect(has(html, "4.545")).toBe(true); // Levy
      expect(has(html, "8.265")).toBe(true); // Service Charge
      expect(has(html, "95.455")).toBe(true);
      expect(has(html, "105.000")).toBe(true);
    });
  }
});

describe("print footer = screen footer (exclusive Sub Total / Discount), whatever the Print Price", () => {
  for (const printPrice of VIEWS) {
    // Balanced footer (fils): the old print showed 302.727 − 30.273 + 27.245 = 299.699 under a 299.700 total.
    it(`#285 ${printPrice} print footer adds up: Sub Total 302.728 − Discount 30.273 = 272.455, + VAT 27.245 = 299.700`, async () => {
      localStorage.setItem("printPrice", printPrice);
      const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(order285)) }, "Inclusive").data;
      const pricing = buildPrintPricing(data, { dataView: "Inclusive", printPrice, orderType: "TakeOut", products });
      const html = await generateGuestPrintHtml(pricing as any, {
        orderNo: "285", ticketNo: "285", waiter: "emp1", counter: "C1", orderType: "TakeOut",
        subTotal: 0, vatAmount: 27.2454545, netAmount: 299.7, printPrice, showCompanyHeader: false,
      });
      expect(html).toMatch(/>\s*302\.728\s*</);
      expect(html).toMatch(/-30\.273/);
      expect(html).toMatch(/>\s*272\.455\s*</);
      expect(html).toMatch(/>\s*27\.245\s*</);
      expect(html).toMatch(/>\s*299\.700\s*</);
      expect(html).not.toMatch(/>\s*333\.000\s*</);
      expect(html).not.toMatch(/-33\.300/);
    });
  }
});
