/**
 * Phase 2a — the shared saved-order loader (terminal/utils/savedOrderToCart.ts).
 * One loader for Settled → Edit, Recall → Edit and Recall → Settle. Totals for all three modes are
 * cross-checked on 200 random carts in posCrossVerification (test 5); this file pins the per-mode
 * differences that were kept on purpose and the Recall → Edit discount fix.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildSavedOrderLoad, dispatchSavedOrderLoad, type SavedOrderLoadMode } from "@pos/terminal/utils/savedOrderToCart";
import { calculateOrder } from "@pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "@pos/terminal/mappers/orderPayloadMapper";
import { applyStoredOrderView } from "@pos/services/storedOrderView";
import posReducer from "@pos/terminal/store/posSlice";
import { selectCartCalculation } from "@pos/terminal/store/posSelectors";

const BURGER = { id: 31, name: "Burger", price: 3.5, vatValue: 10, isIncl: true };
const FRIES = { id: 32, name: "Fries", price: 1.2, vatValue: 10, isIncl: false };
const products = [BURGER, FRIES];
const productCache = { 31: BURGER, 32: FRIES };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5, deliveryCharge: 1 } }));
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("decimalPart", "3");
});

/** Save a cart the way the POS does, then return it as the backend gives it back. */
const savedOrder = (opts: { orderType: string; orderTypeId: number; items: any[]; bill?: { type: "percentage" | "amount"; value: number }; master?: any }) => {
  const calc = calculateOrder(opts.items, {
    orderType: opts.orderType, orderTypeId: opts.orderTypeId, productCache,
    billDiscountValue: opts.bill?.value, billDiscountType: opts.bill?.type, customDeliveryCharge: opts.orderTypeId === 4 ? 1 : null,
  });
  const p: any = buildDirectSettleOrderPayload({
    cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal, deliveryCharge: calc.summary.deliveryCharge,
    selectedOrderTypeName: opts.orderType, selectedOrderTypeId: opts.orderTypeId,
    billDiscountValue: opts.bill?.value ?? 0, billDiscountType: opts.bill?.type ?? "percentage",
  } as any, { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-05" } as any);
  const stored = {
    masterData: {
      orderNo: 500, orderType: opts.orderType, orderTypeId: opts.orderTypeId, deliveryCharge: p.deliveryCharge,
      discAmount: p.discAmount, discPer: p.discPer, serviceCharge: p.serviceCharge, levy: p.levy,
      vatExclAmount: p.vatExclAmount, vatAmount: p.vatAmount, netAmount: p.netAmount, ...opts.master,
    },
    detailsData: p.details.map((d: any) => ({
      qty: d.qty, productId: d.productId, productName: d.productId === 31 ? "Burger" : "Fries", price: d.price,
      amount: d.price * d.qty, discAmount: d.discAmount, discPer: d.discPer, serviceCharge: d.serviceCharge, levy: d.levy,
      vatAmount: d.vatAmount, vatValue: 10, mapId: d.mapId,
    })),
    modifiersData: null,
  };
  return { payload: p, data: applyStoredOrderView({ data: JSON.parse(JSON.stringify(stored)) }, "Inclusive").data };
};

const loadInto = (data: any, mode: SavedOrderLoadMode, extra: any = {}) => {
  const load = buildSavedOrderLoad(JSON.parse(JSON.stringify(data)), { mode, orderId: 500, products, productCache, ...extra });
  const actions: any[] = [];
  dispatchSavedOrderLoad(load, ((a: any) => { actions.push(a); return a; }) as any, 500);
  let state = posReducer(undefined, { type: "@@init" } as any);
  for (const a of actions) state = posReducer(state, a);
  state = { ...state, productCache } as any;
  return { load, actions, state, total: selectCartCalculation({ pos: { ...state, isCartModified: true } } as any).summary.grandTotal };
};

const items = () => [
  { uniqueId: "a", productId: 31, quantity: 2, price: 3.5, isIncl: true, product: BURGER },
  { uniqueId: "b", productId: 32, quantity: 1, price: 1.2, isIncl: false, product: FRIES },
];

describe("shared saved-order loader", () => {
  it("item discounts: POS-saved orders keep them as item discounts in every mode", () => {
    const its = items();
    (its[0] as any).discountValue = 10; (its[0] as any).discountType = "percentage";
    (its[1] as any).discountValue = 0.2; (its[1] as any).discountType = "amount";
    const { payload, data } = savedOrder({ orderType: "TakeOut", orderTypeId: 2, items: its });
    expect(payload.discAmount).toBe(0); // the POS saves item discounts on the lines only
    for (const mode of ["recallEdit", "recallSettle", "settledEdit"] as const) {
      const { state, total } = loadInto(data, mode);
      expect(state.billDiscountValue).toBe(0);
      expect(state.cartItems.filter((i: any) => Number(i.discountValue) > 0)).toHaveLength(2);
      expect(Math.round(total * 1000)).toBe(Math.round(payload.netAmount * 1000));
    }
  });

  it("KNOWN LIMITATION: if the master carries the SUM of item discounts they come back as an equal bill discount (same total, all modes)", () => {
    const its = items();
    (its[0] as any).discountValue = 10; (its[0] as any).discountType = "percentage";
    const first = savedOrder({ orderType: "TakeOut", orderTypeId: 2, items: its });
    const lineSum = first.payload.details.reduce((s: number, d: any) => s + d.discAmount, 0);
    const { payload, data } = savedOrder({ orderType: "TakeOut", orderTypeId: 2, items: its, master: { discAmount: lineSum } });
    const loads = (["recallEdit", "recallSettle", "settledEdit"] as const).map((m) => loadInto(data, m));
    for (const { state, total } of loads) {
      expect(state.billDiscountValue).toBeGreaterThan(0); // saved data cannot tell the two apart
      expect(Math.round(total * 1000)).toBe(Math.round(payload.netAmount * 1000));
    }
  });

  it("bill discounts (amount and %) survive every mode", () => {
    for (const bill of [{ type: "amount" as const, value: 1 }, { type: "percentage" as const, value: 10 }]) {
      const { payload, data } = savedOrder({ orderType: "DineIn", orderTypeId: 1, items: items(), bill });
      for (const mode of ["recallEdit", "recallSettle", "settledEdit"] as const) {
        const { state, total } = loadInto(data, mode);
        expect(state.billDiscountValue).toBeGreaterThan(0);
        expect(Math.round(total * 1000)).toBe(Math.round(payload.netAmount * 1000));
      }
    }
  });

  it("settled edit: always a settled edit; sale id from the voucher, else the order id; restores table + customer", () => {
    const { data } = savedOrder({ orderType: "DineIn", orderTypeId: 1, items: items(), master: { tableNo: "T7", customerId: 9, customerName: "Sara" } });
    const a = loadInto(data, "settledEdit");
    expect(a.load.payload.isSettledEdit).toBe(true);
    expect(a.load.payload.editingSaleId).toBe(500); // no voucher → order id
    expect(a.actions.map((x) => x.type)).toEqual(["pos/loadRecalledOrder", "pos/setTableNo", "pos/setSelectedCustomer"]);
    const withVoucher = { ...data, masterData: { ...data.masterData, voucherNo: "SI-0042" } };
    expect(loadInto(withVoucher, "settledEdit").load.payload.editingSaleId).toBe(42);
  });

  it("recall edit / settle: settled only when the order carries a voucher number", () => {
    const { data } = savedOrder({ orderType: "TakeOut", orderTypeId: 2, items: items() });
    expect(loadInto(data, "recallEdit").load.payload).toMatchObject({ isSettledEdit: false, editingSaleId: null });
    const withVoucher = { ...data, masterData: { ...data.masterData, voucherNo: "77" } };
    expect(loadInto(withVoucher, "recallEdit").load.payload).toMatchObject({ isSettledEdit: true, editingSaleId: 77 });
    expect(loadInto(data, "recallEdit").actions.map((x) => x.type)).toEqual(["pos/loadRecalledOrder"]);
  });

  it("recall settle adds the delivery fields and isSettling; the others carry authoritativeCharges", () => {
    const { data } = savedOrder({ orderType: "Delivery", orderTypeId: 4, items: items(), master: { flatNo: "12", area: "Seef", customerName: "Ali" } });
    const settle = loadInto(data, "recallSettle");
    expect(settle.load.payload).toMatchObject({ isSettling: true, flatNo: "12", area: "Seef", deliveryCustomerName: "Ali" });
    expect(settle.load.payload.authoritativeCharges).toBeUndefined();
    expect(settle.load.deliveryDetails).toMatchObject({ flatNo: "12", area: "Seef" });
    expect(settle.load.netAmount).toBe(settle.load.payload.authoritativeNetAmount);
    const edit = loadInto(data, "recallEdit");
    expect(edit.load.payload.isSettling).toBeUndefined();
    expect(edit.load.payload.authoritativeCharges).toBeDefined();
    expect(edit.actions.map((x) => x.type)).toEqual(["pos/loadRecalledOrder", "pos/setDeliveryDetails"]);
  });

  it("order type: master first, then the recall hints, then the mode default", () => {
    const { data } = savedOrder({ orderType: "TakeOut", orderTypeId: 2, items: items() });
    const noType = { ...data, masterData: { ...data.masterData, orderType: undefined, orderTypeId: undefined } };
    expect(loadInto(noType, "settledEdit").load.orderTypeName).toBe("DineIn");
    expect(loadInto(noType, "recallEdit").load.orderTypeName).toBe("TakeOut");
    expect(loadInto(noType, "recallEdit", { orderTypeHints: [undefined, "Delivery"] }).load.orderTypeName).toBe("Delivery");
    expect(loadInto(data, "recallEdit", { orderTypeHints: ["Delivery"] }).load.orderTypeName).toBe("TakeOut");
  });

  it("stores the order's last update time for the update call", () => {
    const { data } = savedOrder({ orderType: "TakeOut", orderTypeId: 2, items: items(), master: { updatedAt: "2026-11-05T08:00:00Z" } });
    sessionStorage.clear();
    loadInto(data, "recallEdit");
    expect(sessionStorage.getItem("order_prevUpdatedAt_500")).toBe("2026-11-05T08:00:00Z");
  });
});
