/**
 * Bug: punch a Dine-In order → Recall → Edit → change the order type to Take Out.
 * The footer still showed the Dine-In service charge (and the saved Dine-In totals).
 *
 * Cause: changing the type dropped the saved rates but did not mark the order as modified, so the
 * selectors kept returning the order's stored ("authoritative") Dine-In totals.
 */
import { describe, it, expect, beforeEach } from "vitest";
import reducer, { loadRecalledOrder, setOrderType, setOrderTypeByName } from "../features/pos/terminal/store/posSlice";
import {
  selectCharges, selectTotalServiceCharge, selectTotal, selectTax, selectNetValue,
} from "../features/pos/terminal/store/posSelectors";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";
import { selectCartDetails, selectDeliveryCharge } from "../features/pos/terminal/store/posSelectors";

const FACTOR_DINE = 1.1 * 1.05 * 1.1; // SC 10 %, levy 5 %, VAT 10 %
const FACTOR_TAKE = 1.05 * 1.1;       // no SC

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
});

/** A saved Dine-In order of one EXCLUSIVE item (base 10), loaded for editing exactly like Recall → Edit. */
const editedDineInOrder = () => {
  const base = 10;
  const sc = 1, levy = 0.55, vat = 1.155; // 10 → +SC 1 → +levy 0.55 → VAT 1.155
  return reducer(undefined, loadRecalledOrder({
    editingOrderId: 501,
    cartItems: [{
      uniqueId: "x", productId: 6, quantity: 1, price: base, isIncl: false, savedVatRate: 10,
      isExisting: true, mapId: 1, originalQty: 1,
      product: { id: 6, name: "Demo", price: base, categoryId: 1, vatValue: 10, isIncl: false },
    }],
    orderTypeId: 1, orderTypeName: "DineIn",
    customerId: 1, addressId: 0, billDiscountValue: 0, billDiscountType: "percentage",
    isCartModified: false,
    editingOrderRates: { serviceCharge: 10, levy: 5 },
    authoritativeCharges: sc + levy,
    authoritativeNetValue: base + sc + levy,
    authoritativeTax: vat,
    authoritativeNetAmount: base * FACTOR_DINE,
    authoritativeSubtotal: base,
    authoritativeDiscount: 0,
  }));
};

const view = (pos: any) => {
  const state = { pos } as any;
  return {
    sc: selectTotalServiceCharge(state),
    charges: selectCharges(state),
    tax: selectTax(state),
    net: selectNetValue(state),
    total: selectTotal(state),
  };
};

describe("edit a Dine-In order and change the order type", () => {
  it("unchanged Dine-In edit still shows the stored totals (with service charge)", () => {
    const v = view(editedDineInOrder());
    expect(v.charges).toBeCloseTo(1.55, 6);
    expect(v.total).toBeCloseTo(10 * FACTOR_DINE, 6);
  });

  it("switching to Take Out removes the service charge and re-prices the order", () => {
    const pos = reducer(editedDineInOrder(), setOrderTypeByName("TakeOut"));
    expect(pos.isCartModified).toBe(true);
    expect(pos.editingOrderRates).toBeNull();
    const v = view(pos);
    expect(v.sc).toBe(0);
    expect(v.charges).toBeCloseTo(0.5, 6);           // levy only: 10 × 5 %
    expect(v.net).toBeCloseTo(10.5, 6);
    expect(v.tax).toBeCloseTo(1.05, 6);
    expect(v.total).toBeCloseTo(10 * FACTOR_TAKE, 6); // 11.55, not the Dine-In 12.705
  });

  it("same through setOrderType (order type buttons on the terminal)", () => {
    const pos = reducer(editedDineInOrder(), setOrderType({ orderTypeId: 3, orderType: "DriveThru" } as any));
    const v = view(pos);
    expect(v.sc).toBe(0);
    expect(v.total).toBeCloseTo(10 * FACTOR_TAKE, 6);
  });

  it("re-selecting the SAME type does not throw away the stored totals", () => {
    const pos = reducer(editedDineInOrder(), setOrderTypeByName("DineIn"));
    expect(pos.isCartModified).toBe(false);
    expect(pos.editingOrderRates).toEqual({ serviceCharge: 10, levy: 5 });
  });
});

/* ── Settled edit: same switch, then RE-SETTLE (sales invoice update) ───────────────────────── */

/** The settle payloads exactly as usePosCartActions.getFormContext → usePosCheckoutFlow build them. */
const settlePayloads = (pos: any) => {
  const state = { pos } as any;
  const order = buildDirectSettleOrderPayload(
    {
      cartDetails: selectCartDetails(state) as any,
      subtotal: 0, discount: 0, charges: selectCharges(state),
      tax: selectTax(state), total: selectTotal(state), netValue: selectNetValue(state),
      totalServiceCharge: selectTotalServiceCharge(state), totalLevy: 0,
      deliveryCharge: selectDeliveryCharge(state),
      selectedOrderTypeId: pos.selectedOrderTypeId, selectedOrderTypeName: pos.selectedOrderTypeName,
      billDiscountType: pos.billDiscountType, billDiscountValue: pos.billDiscountValue,
      editingOrderId: pos.editingOrderId, editingOrderRates: pos.editingOrderRates,
      voidProducts: [], voidModifiers: [], combinedOrderIds: [],
    },
    { employeeId: 1, transDate: "2026-11-04" }
  );
  const invoice = buildSalesInvoicePayload({
    orderPayload: order, payments: [{ paymodeId: 1, amount: order.netAmount }],
    employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-04",
    editingSaleId: pos.editingSaleId, isOrderEdited: pos.isCartModified,
  });
  return { order, invoice };
};

const editedSettledDineIn = () =>
  reducer(editedDineInOrder(), loadRecalledOrder({
    ...({} as any),
    editingOrderId: 501, editingSaleId: 77, isSettledEdit: true,
    cartItems: editedDineInOrder().cartItems,
    orderTypeId: 1, orderTypeName: "DineIn", customerId: 1, addressId: 0,
    billDiscountValue: 0, billDiscountType: "percentage", isCartModified: false,
    editingOrderRates: { serviceCharge: 10, levy: 5 },
    authoritativeCharges: 1.55, authoritativeNetValue: 11.55, authoritativeTax: 1.155,
    authoritativeNetAmount: 10 * FACTOR_DINE, authoritativeSubtotal: 10, authoritativeDiscount: 0,
  }));

describe("settled edit: change the order type, then re-settle", () => {
  it("unchanged settled Dine-In: invoice keeps the saved service charge", () => {
    const { invoice } = settlePayloads(editedSettledDineIn());
    expect(invoice.saleId).toBe(77);
    expect(invoice.serviceCharge).toBeCloseTo(1, 6);
    expect(invoice.netAmount).toBeCloseTo(10 * FACTOR_DINE, 6);
  });

  it("switched to Take Out: screen, order and invoice all drop the service charge", () => {
    const pos = reducer(editedSettledDineIn(), setOrderTypeByName("TakeOut"));
    expect(pos.isSettledEdit).toBe(true);
    expect(view(pos).sc).toBe(0);
    expect(view(pos).total).toBeCloseTo(10 * FACTOR_TAKE, 6);

    const { order, invoice } = settlePayloads(pos);
    expect(order.orderTypeId).toBe(2);
    expect(order.serviceCharge).toBe(0);
    expect(order.details[0].serviceCharge).toBe(0);
    expect(order.netAmount).toBeCloseTo(10 * FACTOR_TAKE, 6);
    expect(invoice.saleId).toBe(77);                 // updates the SAME sale
    expect(invoice.orderMaster.isOrderEdited).toBe(true);
    expect(invoice.serviceCharge).toBe(0);
    expect(invoice.levy).toBeCloseTo(0.5, 6);
    expect(invoice.vatAmount).toBeCloseTo(1.05, 6);
    expect(invoice.netAmount).toBeCloseTo(10 * FACTOR_TAKE, 6);
  });
});
