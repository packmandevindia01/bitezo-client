/**
 * POS FLOW SAFETY NET — "golden master" snapshots of the CURRENT, verified POS behaviour (2026-11-05).
 *
 * Purpose: the optimization / restructuring (OPTIMIZATION_PLAN.md) must not change what the POS
 * calculates, saves or prints. Every scenario below drives the REAL Redux store with the same actions
 * the screens dispatch, builds the payloads exactly like usePosCartActions.getFormContext(), and
 * snapshots:
 *   - cart totals (screen),
 *   - cart lines (price / qty / discount / extras / VAT / line totals),
 *   - new-order, direct-settle and sales-invoice payloads (what the backend receives),
 *   - saved order → settled edit → modified → update-order payload,
 *   - guest bill and KOT print text.
 *
 * If a snapshot changes, the refactor changed POS behaviour. Only update snapshots
 * (`npx vitest run -u src/tests/posFlowSafetyNet.test.ts`) when the change is INTENDED and reviewed.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import posReducer, {
  addToCart, cacheProducts, incrementItem, decrementItem, removeFromCart, setOrderTypes, setOrderTypeByName,
  setBillDiscount, setItemDiscount, updateItemPrice, updateItemQty, setItemCustomizations,
  setCustomDeliveryCharge, setSectionId, setTableId, setTableNo, setGuestNo, setCustomerId, setAddressId,
} from "../features/pos/terminal/store/posSlice";
import {
  selectCartCalculation, selectCartDetails, selectSubtotal, selectDiscount, selectNetValue, selectTax, selectCharges,
  selectTotalServiceCharge, selectTotalLevy, selectTotal, selectDeliveryCharge,
} from "../features/pos/terminal/store/posSelectors";
import { buildDirectSettleOrderPayload, buildNewOrderPayload, buildUpdateOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import { storedOrderFooter } from "../features/pos/pricing";
import { buildPrintPricing } from "../features/pos/utils/printPricing";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";

// ── fixed world ──────────────────────────────────────────────────────────────
const NOW = new Date("2026-11-05T09:30:00.000Z");
beforeAll(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });
afterAll(() => { vi.useRealTimers(); });

const ORDER_TYPES = [
  { orderTypeId: 1, orderType: "DineIn" },
  { orderTypeId: 2, orderType: "TakeOut" },
  { orderTypeId: 4, orderType: "Delivery" },
] as any[];

// Product master (isIncl = price contains VAT + levy + SC)
const BURGER = { id: 101, name: "Chicken Burger", price: 2.4, vatValue: 10, isIncl: true, categoryId: 1, unitId: 1 };
const FRIES = { id: 102, name: "Fries", price: 0.85, vatValue: 10, isIncl: false, categoryId: 1, unitId: 1 };
const KARAK = { id: 103, name: "Karak Tea", price: 0.2, vatValue: 0, isIncl: true, categoryId: 2, unitId: 1 };
const MIXGRILL = { id: 104, name: "Mix Grill", price: 7.755, vatValue: 10, isIncl: false, categoryId: 3, unitId: 1 };
const PRODUCTS = [BURGER, FRIES, KARAK, MIXGRILL];

const CHEESE = { id: 501, name: "Extra Cheese", price: 0.2, qty: 1, typeId: 1 };
const SAUCE = { id: 502, name: "Garlic Sauce", price: 0.105, qty: 1, typeId: 1 };
const NO_ONION = { id: 601, name: "Onion", qty: 1, typeId: 3, typeName: "NO" };
const MSG = { id: 701, name: "Well done" };

const SESSION = { dayId: 7, shiftId: 3, userId: 1, employeeId: 12, customerId: 1, transDate: "2026-11-05" } as any;

const configure = (opts: { vat?: boolean; sc?: number; levy?: number; view?: "Inclusive" | "Exclusive"; discCalc?: "Inclusive" | "Exclusive"; delivery?: number } = {}) => {
  const { vat = true, sc = 10, levy = 5, view = "Inclusive", discCalc = "Inclusive", delivery = 1 } = opts;
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: vat, serviceCharges: sc, levy, deliveryCharge: delivery, priceView: view, discountCalc: discCalc } }));
  localStorage.setItem("priceView", view);
  localStorage.setItem("printPrice", view);
  localStorage.setItem("discCalc", discCalc);
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("currencySymbol", "BHD");
  localStorage.setItem("systemSeriesId", "1");
  localStorage.setItem("systemBranchId", "2");
  localStorage.setItem("kotArabic", "Disable");
  localStorage.setItem("billArabic", "Disable");
};

// ── store driver ─────────────────────────────────────────────────────────────
const freshState = () => {
  let s = posReducer(undefined, { type: "@@init" } as any);
  s = posReducer(s, cacheProducts(PRODUCTS as any));
  s = posReducer(s, setOrderTypes(ORDER_TYPES));
  return s;
};
const run = (state: any, ...actions: any[]) => actions.reduce((s, a) => posReducer(s, a), state);
const add = (uniqueId: string, p: any, extra: any = {}) => addToCart({ uniqueId, productId: p.id, price: p.price, isIncl: p.isIncl, unitId: 1, forceNewRow: true, ...extra });

const root = (pos: any) => ({ pos }) as any;

/** Same object usePosCartActions.getFormContext() builds from the store. */
const formContext = (pos: any) => {
  const r = root(pos);
  return {
    cartDetails: selectCartDetails(r), subtotal: selectSubtotal(r), discount: selectDiscount(r), tax: selectTax(r),
    netValue: selectNetValue(r), charges: selectCharges(r), totalServiceCharge: selectTotalServiceCharge(r),
    totalLevy: selectTotalLevy(r), total: selectTotal(r), deliveryCharge: selectDeliveryCharge(r),
    selectedOrderTypeId: pos.selectedOrderTypeId, selectedOrderTypeName: pos.selectedOrderTypeName,
    selectedCustomerId: pos.selectedCustomerId, selectedAddressId: pos.selectedAddressId,
    selectedSectionId: pos.selectedSectionId, selectedTableId: pos.selectedTableId, selectedTableNo: pos.selectedTableNo,
    guestNo: pos.guestNo, missedCall: pos.missedCall, contactNo: pos.contactNo, callBack: pos.callBack || "",
    note: pos.note, change: pos.change || "", isComing: pos.isComing, comingTime: pos.comingTime,
    vehicleCustomerName: pos.vehicleCustomerName, vehicleNo: pos.vehicleNo,
    billDiscountType: pos.billDiscountType, billDiscountValue: pos.billDiscountValue,
    editingOrderId: pos.editingOrderId, voidProducts: pos.voidProducts, voidModifiers: pos.voidModifiers,
    combinedOrderIds: pos.combinedOrderIds, prevUpdatedAt: pos.prevUpdatedAt, editingOrderRates: pos.editingOrderRates,
  } as any;
};

/** Screen numbers: summary + the per-line fields a cashier sees / the payload uses. */
const screenView = (pos: any) => {
  const calc = selectCartCalculation(root(pos));
  return {
    summary: calc.summary,
    lines: calc.lines.map((l: any) => ({
      uniqueId: l.uniqueId, productId: l.productId, quantity: l.quantity, price: l.price, isIncl: l.isIncl,
      discountType: l.discountType, discountValue: l.discountValue, extras: (l.extras || []).map((e: any) => [e.name, e.price, e.qty]),
      modifiers: (l.modifiers || []).map((m: any) => [m.typeName, m.name]), messages: (l.messages || []).map((m: any) => m.name),
      amount: l.amount, itemDiscountAmount: l.itemDiscountAmount, billDiscountAmount: l.billDiscountAmount,
      sc: l.sc, levy: l.levy, vatRate: l.vatRate, vatAmount: l.vatAmount, lineTotal: l.lineTotal, lineNetAmount: l.lineNetAmount,
    })),
  };
};

/** Saved order as the backend returns it (exclusive values the POS sent, R9). */
const storedFromPayload = (payload: any, orderNo: number) => ({
  masterData: {
    orderNo, ticketNo: orderNo, orderType: payload.orderTypeId === 1 ? "DineIn" : payload.orderTypeId === 4 ? "Delivery" : "TakeOut",
    orderTypeId: payload.orderTypeId, deliveryCharge: payload.deliveryCharge, discAmount: payload.discAmount, discPer: payload.discPer,
    serviceCharge: payload.serviceCharge, levy: payload.levy, vatExclAmount: payload.vatExclAmount, vatAmount: payload.vatAmount,
    netAmount: payload.netAmount, tableId: payload.tableId, sectionId: payload.sectionId, guestNo: payload.guestNo,
    complimentaryStatus: payload.complimentaryStatus,
  },
  detailsData: payload.details.map((d: any) => {
    const p = PRODUCTS.find((x) => x.id === d.productId)!;
    return {
      qty: d.qty, productId: d.productId, productName: p.name, price: d.price, amount: d.price * d.qty, discAmount: d.discAmount,
      discPer: d.discPer, serviceCharge: d.serviceCharge, levy: d.levy, vatAmount: d.vatAmount, vatValue: p.vatValue,
      netAmount: d.netAmount, mapId: d.mapId, complimentaryStatus: d.complimentaryStatus,
    };
  }),
  modifiersData: (payload.modifiers || []).map((m: any) => ({
    ...m,
    modifierName: [CHEESE, SAUCE, MSG].find((x) => x.id === m.modifierId)?.name ?? (m.modifierId === NO_ONION.id ? "Onion" : `M${m.modifierId}`),
    ...(m.modifierId === MSG.id ? { status: "Message" } : {}),
    typeName: m.modifierId === NO_ONION.id ? "NO" : "",
  })),
});

const invoiceFor = (payload: any) =>
  buildSalesInvoicePayload({
    orderPayload: payload, payments: [{ paymodeId: 1, amount: payload.netAmount }],
    employeeId: 12, dayId: 7, shiftId: 3, transDate: "2026-11-05",
  } as any);

/** comingTime is set when the store module loads (real clock, before time is frozen) — mask it. */
const stable = (v: any): any =>
  JSON.parse(JSON.stringify(v, (k, val) => (k === "comingTime" && typeof val === "string" ? "<comingTime>" : val)));

const text = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const printTexts = async (payload: any, orderNo: number, printPrice: "Inclusive" | "Exclusive") => {
  const stored = storedFromPayload(payload, orderNo);
  const pricing = buildPrintPricing(JSON.parse(JSON.stringify(stored)), {
    dataView: "Exclusive", printPrice, orderType: stored.masterData.orderType, products: PRODUCTS,
  });
  const data = {
    orderNo: String(orderNo), ticketNo: String(orderNo), waiter: "Ali", counter: "C1", orderType: stored.masterData.orderType,
    orderTypeId: stored.masterData.orderTypeId, subTotal: 0, vatAmount: payload.vatAmount, netAmount: payload.netAmount,
    deliveryCharge: payload.deliveryCharge, printPrice, showCompanyHeader: false, date: "05/11/2026", time: "12:30:00 PM",
  } as any;
  const bill = text(await generateGuestPrintHtml(pricing as any, data));
  const kot = text(await generateKotHtml(selectCartDetails(root(currentPosForKot)) as any, { ...data, companyNameKot: false } as any));
  return { grandTotal: pricing.summary.grandTotal, bill, kot };
};
let currentPosForKot: any = null;

/** Full chain for one scenario. */
const chain = async (pos: any, orderNo: number) => {
  const ctx = formContext(pos);
  const directSettle = buildDirectSettleOrderPayload(ctx, SESSION);
  const newOrder = buildNewOrderPayload(ctx, SESSION);
  const invoice = invoiceFor(directSettle);
  currentPosForKot = pos;
  const prints = await printTexts(directSettle, orderNo, localStorage.getItem("printPrice") as any);
  return { screen: screenView(pos), newOrder, directSettle, invoice, prints };
};

// ── consistency every scenario must keep (independent of the snapshot) ─────────
const assertConsistent = (r: Awaited<ReturnType<typeof chain>>) => {
  const s = r.screen.summary;
  const p = r.directSettle as any;
  expect(p.netAmount).toBeCloseTo(s.grandTotal, 9);
  expect(r.newOrder.netAmount).toBeCloseTo(s.grandTotal, 9);
  expect((r.invoice as any).netAmount).toBeCloseTo(s.grandTotal, 9);
  expect(p.vatAmount).toBeCloseTo(s.vatAmount, 9);
  expect(p.vatExclAmount + p.vatAmount + (p.deliveryCharge || 0)).toBeCloseTo(p.netAmount, 9);
  expect(r.prints.grandTotal).toBeCloseTo(p.netAmount, 6);
  const fils = (n: number) => n.toFixed(3);
  expect(r.prints.bill).toContain(fils(Math.round(p.netAmount * 1000) / 1000));
};

describe("POS flow safety net (golden master)", () => {
  beforeEach(() => configure());

  it("S1 Take-Out: incl + excl items, qty +/−, extras, modifier, message, item % and amount discounts", async () => {
    configure({ sc: 10, levy: 5 });
    let pos = run(freshState(), setOrderTypeByName("TakeOut"),
      add("a", BURGER), incrementItem({ uniqueId: "a" }),
      add("b", FRIES, { quantity: 3 }), decrementItem({ uniqueId: "b" }),
      add("c", KARAK),
      setItemCustomizations({ uniqueId: "a", extras: [CHEESE, SAUCE] as any, modifiers: [NO_ONION] as any, messages: [MSG] }),
      setItemDiscount({ uniqueId: "a", value: 10, type: "percentage" }),
      setItemDiscount({ uniqueId: "b", value: 0.5, type: "amount" }),
    );
    const r = await chain(pos, 9001);
    assertConsistent(r);
    expect(stable(r)).toMatchSnapshot();
  });

  it("S2 Dine-In: service charge + levy, table / section / guests, AMOUNT bill discount", async () => {
    configure({ sc: 10, levy: 5, discCalc: "Inclusive" });
    let pos = run(freshState(), setOrderTypeByName("DineIn"),
      setSectionId(2), setTableId(14), setTableNo("T14"), setGuestNo(3),
      add("a", MIXGRILL), add("b", BURGER, { quantity: 2 }),
      setItemCustomizations({ uniqueId: "b", extras: [CHEESE] as any }),
      setBillDiscount({ value: 1.5, type: "amount" }),
    );
    const r = await chain(pos, 9002);
    assertConsistent(r);
    expect(stable(r)).toMatchSnapshot();
  });

  it("S3 Delivery: custom delivery charge (untaxed), % bill discount, customer + address", async () => {
    configure({ sc: 10, levy: 5, delivery: 1 });
    let pos = run(freshState(), setOrderTypeByName("Delivery"), setCustomerId(55), setAddressId(77),
      add("a", BURGER, { quantity: 2 }), add("b", FRIES, { quantity: 2 }),
      setCustomDeliveryCharge(0.75), setBillDiscount({ value: 10, type: "percentage" }),
    );
    const r = await chain(pos, 9003);
    assertConsistent(r);
    expect(r.screen.summary.serviceCharge).toBe(0); // no SC outside Dine-In
    expect(stable(r)).toMatchSnapshot();
  });

  it("S4 Complimentary: 100 % bill discount → total 0, complimentary flags", async () => {
    configure();
    let pos = run(freshState(), setOrderTypeByName("TakeOut"), add("a", BURGER), add("b", FRIES),
      setBillDiscount({ value: 100, type: "percentage" }));
    const r = await chain(pos, 9004);
    expect(r.screen.summary.grandTotal).toBe(0);
    expect(stable(r)).toMatchSnapshot();
  });

  it("S5 Manual price edit, qty keypad, remove line, Exclusive view + Exclusive discount calc", async () => {
    configure({ view: "Exclusive", discCalc: "Exclusive", sc: 0, levy: 0 });
    let pos = run(freshState(), setOrderTypeByName("TakeOut"),
      add("a", MIXGRILL), add("b", FRIES), add("c", KARAK),
      updateItemPrice({ uniqueId: "a", price: 6.5, isIncl: true }),
      updateItemQty({ uniqueId: "b", quantity: 4 }),
      removeFromCart({ uniqueId: "c" }),
      setItemDiscount({ uniqueId: "b", value: 1, type: "amount" }),
    );
    const r = await chain(pos, 9005);
    assertConsistent(r);
    expect(stable(r)).toMatchSnapshot();
  });

  it("S6 VAT disabled in config", async () => {
    configure({ vat: false, sc: 0, levy: 0 });
    let pos = run(freshState(), setOrderTypeByName("TakeOut"), add("a", BURGER, { quantity: 2 }), add("b", FRIES));
    const r = await chain(pos, 9006);
    assertConsistent(r);
    expect(r.screen.summary.vatAmount).toBe(0);
    expect(stable(r)).toMatchSnapshot();
  });

  it("S7 Saved order → settled edit (unchanged = same total) → add qty → update-order payload", async () => {
    configure({ sc: 10, levy: 5 });
    let pos = run(freshState(), setOrderTypeByName("DineIn"), setTableId(5), setSectionId(1),
      add("a", BURGER, { quantity: 2 }), add("b", FRIES),
      setItemCustomizations({ uniqueId: "a", extras: [CHEESE] as any }),
      setItemDiscount({ uniqueId: "b", value: 10, type: "percentage" }),
    );
    const saved = buildNewOrderPayload(formContext(pos), SESSION) as any;
    const stored = storedFromPayload(saved, 9007);

    const results: any = {};
    for (const view of ["Inclusive", "Exclusive"] as const) {
      localStorage.setItem("priceView", view);
      const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(stored)) }, view).data;
      const footer = storedOrderFooter(data, view);
      expect(footer.netAmount).toBeCloseTo(saved.netAmount, 6);

      const actions: any[] = [];
      loadSettledOrderIntoCart({ orderId: 9007, orderData: data, dispatch: ((a: any) => { actions.push(a); return a; }) as any, products: PRODUCTS, productCache: Object.fromEntries(PRODUCTS.map((p) => [p.id, p])), showToast: () => {} });
      let edit = freshState();
      for (const a of actions) if (a?.type) edit = posReducer(edit, a);
      const unchanged = selectCartCalculation(root({ ...edit, isCartModified: true })).summary.grandTotal;
      expect(unchanged).toBeCloseTo(saved.netAmount, 4);

      const fries = edit.cartItems.find((i: any) => i.productId === FRIES.id)!;
      edit = run(edit, updateItemQty({ uniqueId: fries.uniqueId, quantity: 3 }));
      const update = buildUpdateOrderPayload(9007, formContext(edit), SESSION) as any;
      results[view] = { footer, editedTotal: selectTotal(root(edit)), update };
    }
    expect(stable({ saved, results })).toMatchSnapshot();
  });
});
