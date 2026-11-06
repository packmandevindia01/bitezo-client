/**
 * Saved order opened for edit in the Exclusive view, one extra removed: the Customise Order panel must keep
 * showing the same line prices as the billing cart. Numbers from the reported order #3:
 * Test Price 100 incl + extra 11 → 96.104, Burgers 1 excl + extra 11 → 10.524, levy 5%, VAT 10%.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "@pos/terminal/utils/savedOrderToCart";
import { getCartLineDisplay } from "@pos/terminal/utils/cartLineDisplay";
import { applyStoredOrderView } from "@pos/services/storedOrderView";
import { calculateOrder } from "@pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "@pos/terminal/mappers/orderPayloadMapper";
import posReducer, { setItemCustomizations } from "@pos/terminal/store/posSlice";
import { selectCartDetails } from "@pos/terminal/store/posSelectors";

const TEST_PRICE = { id: 1, name: "Test Price", price: 100, vatValue: 10, isIncl: true, categoryId: 1 };
const BURGERS = { id: 2, name: "Burgers", price: 1, vatValue: 10, isIncl: false, categoryId: 1 };
const products = [TEST_PRICE, BURGERS];
const productCache = { 1: TEST_PRICE, 2: BURGERS };

const EXTRA = { id: 9, name: "Extras", price: 11, qty: 1, typeId: 1 };

type PosAction = Parameters<typeof posReducer>[1];

/** The parts of the save payload this test reads. */
interface SavedPayload {
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  details: { qty: number; productId: number; price: number; discAmount: number; serviceCharge: number; levy: number; vatAmount: number; mapId: number }[];
  modifiers?: Record<string, unknown>[];
}

/** Save the cart the way the POS does, then return what the backend stores (see posCrossVerification). */
const savedOrder = () => {
  const calc = calculateOrder(
    [
      { uniqueId: "a", productId: 1, quantity: 1, price: 100, isIncl: true, product: TEST_PRICE, extras: [EXTRA] },
      { uniqueId: "b", productId: 2, quantity: 1, price: 1, isIncl: false, product: BURGERS, extras: [EXTRA] },
    ] as never,
    { orderType: "TakeOut", orderTypeId: 2, productCache } as never,
  );
  const p = buildDirectSettleOrderPayload({
    cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal, deliveryCharge: 0,
    selectedOrderTypeName: "TakeOut", selectedOrderTypeId: 2, billDiscountValue: 0, billDiscountType: "percentage",
  } as never, { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-06" } as never) as unknown as SavedPayload;
  return {
    masterData: {
      orderNo: 3, orderType: "TakeOut", orderTypeId: 2, deliveryCharge: 0, discAmount: 0, discPer: 0,
      serviceCharge: p.serviceCharge, levy: p.levy, vatExclAmount: p.vatExclAmount, vatAmount: p.vatAmount, netAmount: p.netAmount,
    },
    detailsData: p.details.map((d, i) => ({
      qty: d.qty, productId: d.productId, productName: i === 0 ? "Test Price" : "Burgers", price: d.price,
      amount: d.price * d.qty, discAmount: d.discAmount, serviceCharge: d.serviceCharge, levy: d.levy,
      vatAmount: d.vatAmount, vatValue: 10, mapId: d.mapId,
      // The menu order_data API sends this; the loader uses it to see that price already includes extras.
      netAmount: d.price * d.qty - d.discAmount + d.serviceCharge + d.levy + d.vatAmount,
    })),
    modifiersData: (p.modifiers || []).map((m) => ({ ...m, modifierName: "Extras", typeName: "" })),
  };
};

const openForEdit = () => {
  // Same path as the app: the order is fetched Exclusive, then the current view is applied.
  const data = applyStoredOrderView({ data: savedOrder() }, "Exclusive").data;
  const load = buildSavedOrderLoad(data, { mode: "recallEdit", orderId: 3, products, productCache } as never);
  const actions: PosAction[] = [];
  dispatchSavedOrderLoad(load, ((a: PosAction) => { actions.push(a); return a; }) as never, 3);
  let state = posReducer(undefined, { type: "@@init" });
  for (const a of actions) state = posReducer(state, a);
  return { ...state, productCache };
};
const lines = (pos: unknown) => selectCartDetails({ pos } as never);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 5, priceView: "Exclusive" } }));
  localStorage.setItem("priceView", "Exclusive");
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("decimalPart", "3");
});

describe("saved order, Exclusive view, extra removed from another line", () => {
  it("regression: the untouched line keeps its displayed price after the change", () => {
    const before = openForEdit();
    const [testBefore, burgersBefore] = lines(before);
    expect(getCartLineDisplay(testBefore).unitPrice).toBeCloseTo(96.104, 3);
    expect(getCartLineDisplay(burgersBefore).unitPrice).toBeCloseTo(10.524, 3);

    const after = posReducer(before, setItemCustomizations({ uniqueId: burgersBefore.uniqueId, extras: [] }));
    const [testAfter, burgersAfter] = lines(after);

    // Cause of the bug: the raw price loses the extras once the cart has changed.
    expect(testAfter.price).toBeCloseTo(86.58, 2);
    expect(getCartLineDisplay(testAfter).unitPrice).toBeCloseTo(96.104, 3);
    expect(getCartLineDisplay(testAfter).lineTotal).toBeCloseTo(96.104, 3);
    expect(getCartLineDisplay(burgersAfter).unitPrice).toBeCloseTo(1, 3);
    expect(getCartLineDisplay(burgersAfter).lineTotal).toBeCloseTo(1, 3);
  });
});

describe("line display", () => {
  it("no extras: the line price", () => {
    expect(getCartLineDisplay({ quantity: 2, price: 5, lineTotal: 10 }).unitPrice).toBe(5);
    expect(getCartLineDisplay({ quantity: 1, product: { price: 7 }, lineTotal: 7 }).unitPrice).toBe(7);
  });

  it("extras: original total per unit, before any item discount", () => {
    const line = { quantity: 2, price: 5, lineTotal: 18, originalLineTotal: 20, itemDiscount: 2, extras: [{ price: 11, qty: 1 }] };
    expect(getCartLineDisplay(line)).toEqual({ unitPrice: 10, originalTotal: 20, lineTotal: 18, itemDiscount: 2 });
  });

  it("extras with no total yet: price plus extras per unit", () => {
    expect(getCartLineDisplay({ quantity: 2, price: 5, extras: [{ price: 4, qty: 1 }] }).unitPrice).toBe(7);
  });
});
