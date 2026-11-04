/**
 * DELIVERY end to end: cart → saved order → invoice → recall → edit → print.
 * Delivery: no service charge, levy + VAT apply to items, delivery charge added AFTER VAT, untaxed,
 * never discounted.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";
import { storedOrderFooter } from "../features/pos/pricing";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import posReducer, { updateItemQty, setOrderTypeByName } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation, selectTotal } from "../features/pos/terminal/store/posSelectors";
import { buildPrintPricing } from "../features/pos/utils/printPricing";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };
const products = [ABCD, DEMO];
const productCache = { 9: ABCD, 6: DEMO };
const session: any = { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-03" };

const items = () => [
  { uniqueId: "a", productId: 9, quantity: 1, price: 100, isIncl: true, product: ABCD },
  { uniqueId: "b", productId: 6, quantity: 2, price: 10, isIncl: false, product: DEMO },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5, deliveryCharge: 2 } }));
  localStorage.setItem("deliveryCharge", "2");
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("printPrice", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("decimalPart", "3");
});

const cartFor = (deliveryCharge: number | null) =>
  calculateOrder(items(), {
    orderType: "Delivery", orderTypeId: 4, productCache,
    billDiscountValue: 10, billDiscountType: "percentage",
    customDeliveryCharge: deliveryCharge,
  });

/** What the backend stores = what the POS sends (exclusive values). */
const storedFromPayload = (payload: any) => ({
  masterData: {
    orderNo: 900, ticketNo: 900, orderType: "Delivery", orderTypeId: 4,
    deliveryCharge: payload.deliveryCharge, discAmount: payload.discAmount, discPer: payload.discPer,
    serviceCharge: payload.serviceCharge, levy: payload.levy,
    vatExclAmount: payload.vatExclAmount, vatAmount: payload.vatAmount, netAmount: payload.netAmount,
  },
  detailsData: payload.details.map((d: any, i: number) => ({
    qty: d.qty, productId: d.productId, productName: i === 0 ? "ABCd" : "Demo",
    price: d.price, amount: d.price * d.qty, discAmount: d.discAmount,
    serviceCharge: d.serviceCharge, levy: d.levy, vatAmount: d.vatAmount, vatValue: 10, mapId: d.mapId,
  })),
  modifiersData: null,
});

describe("delivery — cart", () => {
  it("no service charge, discount not applied to delivery, delivery added after VAT (untaxed)", () => {
    const c = cartFor(1.5).summary;
    expect(c.serviceCharge).toBe(0);
    expect(c.deliveryCharge).toBe(1.5);
    expect(c.grandTotal).toBeCloseTo(112.29, 6);            // (100 + 23.1) × 0.9 + 1.5
    expect(c.vatExclAmount + c.vatAmount).toBeCloseTo(110.79, 6); // VAT base excludes delivery
  });

  it("default delivery charge from POS config when none is typed", () => {
    expect(cartFor(null).summary.deliveryCharge).toBe(2);
  });

  it("delivery charge only for Delivery orders", () => {
    const c = calculateOrder(items(), { orderType: "TakeOut", orderTypeId: 2, productCache, customDeliveryCharge: 1.5 });
    expect(c.summary.deliveryCharge).toBe(0);
  });
});

describe("delivery — saved order, invoice, recall, edit, print", () => {
  const save = () => {
    const calc = cartFor(1.5);
    const payload = buildDirectSettleOrderPayload({
      cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal,
      deliveryCharge: calc.summary.deliveryCharge, selectedOrderTypeName: "Delivery", selectedOrderTypeId: 4,
      billDiscountValue: 10, billDiscountType: "percentage",
    } as any, session);
    return { calc, payload };
  };

  it("order payload: delivery stored once, not in VAT base, totals consistent", () => {
    const { payload } = save();
    expect(payload.deliveryCharge).toBe(1.5);
    expect(payload.netAmount).toBeCloseTo(112.29, 6);
    expect(payload.serviceCharge).toBe(0);
    expect(payload.vatExclAmount + payload.vatAmount + payload.deliveryCharge).toBeCloseTo(payload.netAmount, 6);
    const linesNet = payload.details.reduce((s: number, d: any) => s + d.netAmount, 0);
    expect(linesNet + payload.deliveryCharge).toBeCloseTo(payload.netAmount, 6);
  });

  it("sales invoice: same total, delivery included once", () => {
    const { payload } = save();
    const inv = buildSalesInvoicePayload({ orderPayload: payload, payments: [{ paymodeId: 1, amount: payload.netAmount }], employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-03" });
    expect(inv.netAmount).toBeCloseTo(112.29, 6);
    expect(inv.deliveryCharge).toBe(1.5);
    expect(inv.vatAmount).toBeCloseTo(payload.vatAmount, 6);
  });

  for (const view of ["Inclusive", "Exclusive"] as const) {
    it(`recall footer and edit keep the delivery charge (${view})`, () => {
      localStorage.setItem("priceView", view);
      const stored = storedFromPayload(save().payload);
      const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(stored)) }, view).data;

      const footer = storedOrderFooter(data, view);
      expect(footer.deliveryCharge).toBe(1.5);
      expect(footer.netAmount).toBeCloseTo(112.29, 6);
      expect(footer.subTotal).toBeCloseTo(100 / 1.155 + 20, 5); // exclusive, before discount, no delivery

      const all: any[] = [];
      loadSettledOrderIntoCart({ orderId: 900, orderData: data, dispatch: ((a: any) => { all.push(a); return a; }) as any, products, productCache, showToast: () => {} });
      let state = posReducer(undefined, { type: "@@init" } as any);
      for (const a of all) if (a?.type) state = posReducer(state, a);
      state = { ...state, productCache } as any;
      expect(state.customDeliveryCharge).toBe(1.5);
      expect(state.billDiscountType).toBe("percentage");
      expect(state.billDiscountValue).toBe(10);

      // Unchanged cart recalculates to the stored total (delivery included, not discounted)
      expect(selectCartCalculation({ pos: { ...state, isCartModified: true } } as any).summary.grandTotal).toBeCloseTo(112.29, 3);
      // Edit: Demo 2 → 3 → (100 + 34.65) × 0.9 + 1.5 = 122.685
      const demo = state.cartItems.find((i: any) => i.productId === 6)!;
      const edited = posReducer(state, updateItemQty({ uniqueId: demo.uniqueId, quantity: 3 }));
      expect(selectTotal({ pos: edited } as any)).toBeCloseTo(122.685, 3);
      // Switching to TakeOut drops the delivery charge
      const takeout = posReducer(edited, setOrderTypeByName("TakeOut"));
      expect(selectCartCalculation({ pos: takeout } as any).summary.deliveryCharge).toBe(0);
    });
  }

  for (const printPrice of ["Inclusive", "Exclusive"] as const) {
    it(`print (${printPrice}): delivery shown, grand total 112.290, VAT excludes delivery`, async () => {
      localStorage.setItem("printPrice", printPrice);
      const stored = storedFromPayload(save().payload);
      const pricing = buildPrintPricing(stored, { dataView: "Exclusive", printPrice, orderType: "Delivery", products });
      expect(pricing.summary.deliveryCharge).toBe(1.5);
      expect(pricing.summary.grandTotal).toBeCloseTo(112.29, 6);
      const html = await generateGuestPrintHtml(pricing as any, {
        orderNo: "900", ticketNo: "900", waiter: "w", counter: "C1", orderType: "Delivery",
        subTotal: 0, vatAmount: stored.masterData.vatAmount, netAmount: stored.masterData.netAmount,
        deliveryCharge: 1.5, printPrice, showCompanyHeader: false,
      });
      expect(html).toMatch(/>\s*112\.290\s*</);
      expect(html).toMatch(/>\s*1\.500\s*</);
      expect(html).toMatch(new RegExp(`>\\s*${stored.masterData.vatAmount.toFixed(3).replace(".", "\\.")}\\s*<`));
    });
  }
});

describe("complimentary delivery order — items free, typed delivery charge still charged and shown", () => {
  const saveComp = () => {
    const calc = calculateOrder(items(), {
      orderType: "Delivery", orderTypeId: 4, productCache,
      billDiscountValue: 100, billDiscountType: "percentage", customDeliveryCharge: 1.5,
    });
    const payload = buildDirectSettleOrderPayload({
      cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal,
      deliveryCharge: calc.summary.deliveryCharge, selectedOrderTypeName: "Delivery", selectedOrderTypeId: 4,
      billDiscountValue: 100, billDiscountType: "percentage", complimentaryStatus: true,
    } as any, session);
    return { calc, payload };
  };

  it("cart, order payload and invoice: total = delivery charge 1.500, VAT 0", () => {
    const { calc, payload } = saveComp();
    expect(calc.summary.grandTotal).toBe(1.5);
    expect(calc.summary.vatAmount).toBe(0);
    expect(payload.netAmount).toBe(1.5);
    expect(payload.deliveryCharge).toBe(1.5);
    expect(payload.complimentaryStatus).toBe(true);
    const inv = buildSalesInvoicePayload({ orderPayload: payload, payments: [{ paymodeId: 1, amount: 1.5 }], employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-03" });
    expect(inv.netAmount).toBe(1.5);
    expect(inv.deliveryCharge).toBe(1.5);
  });

  for (const view of ["Inclusive", "Exclusive"] as const) {
    it(`recall + edit show total 1.500 (not 0) (${view})`, () => {
      localStorage.setItem("priceView", view);
      const stored = storedFromPayload(saveComp().payload);
      (stored.masterData as any).discPer = 100;
      (stored.masterData as any).complimentaryStatus = true;
      const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(stored)) }, view).data;
      expect(storedOrderFooter(data, view).netAmount).toBe(1.5);

      const all: any[] = [];
      loadSettledOrderIntoCart({ orderId: 901, orderData: data, dispatch: ((a: any) => { all.push(a); return a; }) as any, products, productCache, showToast: () => {} });
      const load = all.find((a) => String(a?.type).endsWith("loadRecalledOrder"));
      expect(load.payload.authoritativeNetAmount).toBe(1.5);
      let state = posReducer(undefined, { type: "@@init" } as any);
      for (const a of all) if (a?.type) state = posReducer(state, a);
      state = { ...state, productCache } as any;
      expect(selectTotal({ pos: state } as any)).toBe(1.5);
      expect(state.customDeliveryCharge).toBe(1.5);
    });
  }

  it("print: grand total 1.500 with the delivery row", async () => {
    const stored = storedFromPayload(saveComp().payload);
    const pricing = buildPrintPricing(stored, { dataView: "Exclusive", printPrice: "Inclusive", orderType: "Delivery", products });
    expect(pricing.summary.grandTotal).toBe(1.5);
    const html = await generateGuestPrintHtml(pricing as any, {
      orderNo: "901", ticketNo: "901", waiter: "w", counter: "C1", orderType: "Delivery",
      subTotal: 0, vatAmount: 0, netAmount: 1.5, deliveryCharge: 1.5, printPrice: "Inclusive", showCompanyHeader: false,
    });
    expect(html).toMatch(/>\s*1\.500\s*</);
  });
});
