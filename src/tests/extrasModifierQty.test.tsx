// @vitest-environment jsdom
/**
 * The same extra or modifier can be added many times to one product: one entry on the line with a qty.
 * Example from the owner: product 10 + 2 × extra at 2 = 14. Extras stay per line (R2), not × line quantity.
 * Covers the screen, cart, payload, invoice, saved order → cart, split, void and prints.
 */
import { createElement } from "react";
import { Provider } from "react-redux";
import { render, screen, fireEvent, waitFor, cleanup, within, renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { PosExtrasModifierModal } from "../features/pos/terminal/components/modals/product/PosExtrasModifierModal";
import { usePosVoidFlow } from "../features/pos/terminal/hooks/usePosVoidFlow";
import { addCustomization, changeCustomizationQty, customizationQty, removeCustomization } from "../features/pos/terminal/utils/lineCustomization";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { getCartLineDisplay } from "../features/pos/terminal/utils/cartLineDisplay";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";
import { mapOrderDetailsToCartItems } from "../features/pos/terminal/mappers/orderDetailToCartMapper";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../features/pos/terminal/utils/savedOrderToCart";
import { buildReorderItems } from "../features/pos/terminal/utils/reorderItems";
import posReducer, { setItemCustomizations } from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { dedupeModifierRows, priceVoidedPortion, storedLineToCartPricing } from "../features/pos/pricing";
import { buildPrintPricing } from "../features/pos/utils/printPricing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";
import { generateBillMarkup, generateKotMarkup } from "../features/pos/utils/escPosGenerator";
import { formatModifierLabel } from "../features/pos/utils/modifierLabel";
import { menuApi } from "../features/pos/services/menuApi";

vi.mock("../features/pos/services/menuApi", async (orig) => {
  const real = await orig<{ menuApi: object }>();
  return {
    ...real,
    menuApi: {
      ...real.menuApi,
      getExtraTypes: vi.fn(),
      getExtras: vi.fn(),
      getModifierTypes: vi.fn(),
      getModifiers: vi.fn(),
    },
  };
});
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const setConfig = (configs: Record<string, unknown> = {}, view = "Inclusive") => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0, ...configs } }));
  localStorage.setItem("priceView", view);
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("kotArabic", "Disable");
  localStorage.setItem("billArabic", "Disable");
};
beforeEach(() => {
  setConfig();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => cleanup());

const product = (over: Record<string, unknown> = {}) => ({ id: 7, name: "Burger", price: 10, vatValue: 0, isIncl: true, categoryId: 1, ...over });
const cheese = (qty: number, price = 2) => ({ id: 11, name: "Cheese", price, qty, typeId: 2 });
const bacon = (qty: number, price = 1.5) => ({ id: 12, name: "Bacon", price, qty, typeId: 2 });
const noOnion = (qty: number) => ({ id: 21, name: "Onion", qty, typeId: 3, typeName: "No" });
const line = (over: Record<string, unknown> = {}, p = product()) => ({
  uniqueId: "a", productId: p.id, quantity: 1, price: p.price, isIncl: p.isIncl, product: p, ...over,
});
const takeOut = { orderType: "TakeOut", orderTypeId: 2 };
const total = (items: unknown[], options: Record<string, unknown> = takeOut) => calculateOrder(items as never, options as never).summary.grandTotal;

const save = (items: unknown[], options: Record<string, unknown> = takeOut) => {
  const calc = calculateOrder(items as never, options as never);
  const payload = buildDirectSettleOrderPayload({
    cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal, deliveryCharge: 0,
    selectedOrderTypeName: options.orderType, selectedOrderTypeId: options.orderTypeId,
    billDiscountValue: options.billDiscountValue ?? 0, billDiscountType: options.billDiscountType ?? "percentage",
  } as never, { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-07" } as never);
  return { calc, payload };
};

/** The order as the backend stores it, built from what the POS sent. */
const storedFrom = (payload: ReturnType<typeof save>["payload"], names: Record<number, string> = { 11: "Cheese", 12: "Bacon", 21: "Onion" }) => ({
  masterData: {
    orderNo: 500, orderType: "TakeOut", orderTypeId: 2, discAmount: payload.discAmount ?? 0,
    serviceCharge: payload.serviceCharge, levy: payload.levy, vatExclAmount: payload.vatExclAmount, vatAmount: payload.vatAmount, netAmount: payload.netAmount,
  },
  detailsData: payload.details.map((d) => ({
    qty: d.qty, productId: d.productId, productName: "Burger", price: d.price, amount: d.price * d.qty, discAmount: d.discAmount,
    serviceCharge: d.serviceCharge, levy: d.levy, vatAmount: d.vatAmount, vatValue: 10, mapId: d.mapId,
  })),
  modifiersData: payload.modifiers.map((m) => ({
    ...m, modifierName: names[m.modifierId], typeName: "", status: Number(m.price) > 0 ? "Extras" : "Modifier",
  })),
});

/** Loads a saved order through the same loader as Recall → Edit and returns the resulting POS state. */
const loadSaved = (stored: unknown, products: ReturnType<typeof product>[]) => {
  const productCache = Object.fromEntries(products.map((p) => [p.id, p]));
  const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(stored)) }, "Inclusive").data;
  const load = buildSavedOrderLoad(data, { mode: "recallEdit", orderId: 500, products, productCache });
  const actions: Parameters<typeof posReducer>[1][] = [];
  dispatchSavedOrderLoad(load, ((a: Parameters<typeof posReducer>[1]) => { actions.push(a); return a; }) as never, 500);
  let state = posReducer(undefined, { type: "@@init" } as never);
  for (const a of actions) if (a?.type) state = posReducer(state, a);
  return { ...state, productCache } as unknown as ReturnType<typeof posReducer>;
};

describe("one line holds one entry per extra or modifier, with a qty", () => {
  it("adds a new entry at qty 1, then raises its qty", () => {
    let list = addCustomization([], cheese(1));
    expect(list).toEqual([cheese(1)]);
    list = addCustomization(list, cheese(1));
    list = addCustomization(list, cheese(1));
    expect(list).toEqual([cheese(3)]);
    expect(customizationQty(list, 11)).toBe(3);
  });

  it("keeps the price already on the line when the master price has changed", () => {
    expect(addCustomization([cheese(1, 2)], cheese(1, 9))).toEqual([cheese(2, 2)]);
  });

  it("a different extra is a separate entry and order is kept", () => {
    const list = addCustomization(addCustomization([cheese(1)], bacon(1)), cheese(1));
    expect(list).toEqual([cheese(2), bacon(1)]);
  });

  it("matches ids given as a string or a number", () => {
    expect(addCustomization([{ ...cheese(1), id: "11" as unknown as number }], cheese(1))[0].qty).toBe(2);
  });

  it("treats a missing or invalid saved qty as 1", () => {
    for (const qty of [undefined, 0, -1, Number.NaN]) {
      expect(customizationQty([{ id: 11, qty }], 11)).toBe(1);
      expect(addCustomization([{ id: 11, qty }], { id: 11 })[0].qty).toBe(2);
    }
  });

  it("does not change the list it is given", () => {
    const list = [cheese(1)];
    addCustomization(list, cheese(1));
    changeCustomizationQty(list, 11, 1);
    removeCustomization(list, 11);
    expect(list).toEqual([cheese(1)]);
  });

  it("− lowers the qty and removes the entry at 0; other entries stay", () => {
    let list = [cheese(2), bacon(1)];
    list = changeCustomizationQty(list, 11, -1);
    expect(list).toEqual([cheese(1), bacon(1)]);
    list = changeCustomizationQty(list, 11, -1);
    expect(list).toEqual([bacon(1)]);
    expect(customizationQty(list, 11)).toBe(0);
    expect(changeCustomizationQty(list, 99, -1)).toEqual([bacon(1)]);
    expect(removeCustomization([cheese(5), bacon(1)], 11)).toEqual([bacon(1)]);
  });
});

describe("cart total", () => {
  it("owner's example: product 10 + 2 × extra at 2 = 14", () => {
    expect(total([line({ extras: [cheese(2)] })])).toBeCloseTo(14, 6);
  });

  it("extras are per line, not × line quantity: 2 × 10 + 2 × 2 = 24", () => {
    expect(total([line({ quantity: 2, extras: [cheese(2)] })])).toBeCloseTo(24, 6);
  });

  it("several extras, each with its own qty: 10 + 3 × 2 + 2 × 1.5 = 19", () => {
    expect(total([line({ extras: [cheese(3), bacon(2)] })])).toBeCloseTo(19, 6);
  });

  it("two lines of one product keep their own extras", () => {
    expect(total([line({ extras: [cheese(2)] }), line({ uniqueId: "b", extras: [cheese(1)] })])).toBeCloseTo(26, 6);
  });

  it("modifiers cost nothing at any qty", () => {
    expect(total([line({ modifiers: [noOnion(5)] })])).toBeCloseTo(10, 6);
  });

  it("an extra with price 0 adds nothing at any qty", () => {
    expect(total([line({ extras: [cheese(4, 0)] })])).toBeCloseTo(10, 6);
  });

  it("two × an extra costs the same as two different extras at that price", () => {
    const twice = calculateOrder([line({ extras: [cheese(2)] })] as never, takeOut as never).lines[0];
    const separate = calculateOrder([line({ extras: [cheese(1), { ...cheese(1), id: 13 }] })] as never, takeOut as never).lines[0];
    expect(twice.lineNetAmount).toBeCloseTo(separate.lineNetAmount, 10);
    expect(twice.vatAmount).toBeCloseTo(separate.vatAmount, 10);
  });

  it("inclusive product with VAT: extras are gross, the total is unchanged and VAT is inside it", () => {
    const p = product({ vatValue: 10 });
    const { summary } = calculateOrder([line({ extras: [cheese(2)] }, p)] as never, takeOut as never);
    expect(summary.grandTotal).toBeCloseTo(14, 6);
    expect(summary.vatAmount).toBeCloseTo(14 - 14 / 1.1, 6);
  });

  it("exclusive product with VAT: 10 × 1.1 + 2 × 2 = 15", () => {
    const p = product({ vatValue: 10, isIncl: false });
    expect(total([line({ extras: [cheese(2)] }, p)])).toBeCloseTo(15, 6);
  });

  it("Dine-In charges use the same factor as the line (SC 10%, levy 5%, VAT 10%)", () => {
    setConfig({ serviceCharges: 10, levy: 5 });
    const p = product({ vatValue: 10 });
    const options = { orderType: "DineIn", orderTypeId: 1 };
    const { summary } = calculateOrder([line({ extras: [cheese(2)] }, p)] as never, options as never);
    expect(summary.grandTotal).toBeCloseTo(14, 6);
    expect(summary.vatExclAmount + summary.vatAmount).toBeCloseTo(14, 6);
  });

  it("item discount % covers the extras at their qty: 14 − 50% = 7", () => {
    expect(total([line({ extras: [cheese(2)], discountValue: 50, discountType: "percentage" })])).toBeCloseTo(7, 6);
  });

  it("item discount amount: 14 − 3 = 11; a discount above the line stops at 0", () => {
    expect(total([line({ extras: [cheese(2)], discountValue: 3, discountType: "amount" })])).toBeCloseTo(11, 6);
    expect(total([line({ extras: [cheese(2)], discountValue: 50, discountType: "amount" })])).toBeCloseTo(0, 6);
  });

  it("bill discount covers the extras at their qty: 14 − 10% = 12.6", () => {
    const options = { ...takeOut, billDiscountValue: 10, billDiscountType: "percentage" };
    expect(total([line({ extras: [cheese(2)] })], options)).toBeCloseTo(12.6, 6);
  });

  it("no float noise with fils prices: 0.1 + 3 × 0.2 = 0.7", () => {
    const p = product({ price: 0.1 });
    expect(total([line({ extras: [cheese(3, 0.2)] }, p)])).toBe(0.7);
  });

  it("the line price shown includes the extras: 14, or 12 per unit at qty 2", () => {
    const one = calculateOrder([line({ extras: [cheese(2)] })] as never, takeOut as never).lines[0];
    expect(getCartLineDisplay(one).unitPrice).toBeCloseTo(14, 6);
    const two = calculateOrder([line({ quantity: 2, extras: [cheese(2)] })] as never, takeOut as never).lines[0];
    expect(getCartLineDisplay(two).unitPrice).toBeCloseTo(12, 6);
  });
});

describe("order and invoice payload", () => {
  it("one row with the qty; price is per unit, amount is price × qty", () => {
    const { payload } = save([line({ extras: [cheese(2)] })]);
    expect(payload.modifiers).toEqual([expect.objectContaining({ mapId: 1, modifierId: 11, qty: 2, price: 2, amount: 4 })]);
    expect(payload.details[0].qty).toBe(1);
    expect(payload.details[0].price).toBeCloseTo(14, 6);
    expect(payload.netAmount).toBeCloseTo(14, 6);
  });

  it("with VAT the row is exclusive: unit 2 / 1.1, amount × qty", () => {
    const { payload } = save([line({ extras: [cheese(2)] }, product({ vatValue: 10 }))]);
    expect(payload.modifiers[0].price).toBeCloseTo(2 / 1.1, 6);
    expect(payload.modifiers[0].amount).toBeCloseTo(4 / 1.1, 6);
    expect(payload.netAmount).toBeCloseTo(14, 6);
  });

  it("a modifier row keeps its qty at no charge", () => {
    const { payload } = save([line({ modifiers: [noOnion(3)] })]);
    expect(payload.modifiers).toEqual([expect.objectContaining({ modifierId: 21, qty: 3, price: 0, amount: 0, typeId: 3 })]);
    expect(payload.netAmount).toBeCloseTo(10, 6);
  });

  it("extras and modifiers go on the right lines with their own qty", () => {
    const { payload } = save([line({ extras: [cheese(2)] }), line({ uniqueId: "b", modifiers: [noOnion(2)], extras: [cheese(3)] })]);
    const rows = payload.modifiers.map((m) => [m.mapId, m.modifierId, m.qty]);
    expect(rows).toEqual([[1, 11, 2], [2, 11, 3], [2, 21, 2]]);
  });

  it("sales invoice: same total and same qty", () => {
    const { payload } = save([line({ extras: [cheese(2)], modifiers: [noOnion(2)] })]);
    const invoice = buildSalesInvoicePayload({ orderPayload: payload, payments: [{ paymodeId: 1, amount: payload.netAmount }], employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-07" } as never);
    expect(invoice.netAmount).toBeCloseTo(14, 6);
    expect(invoice.modifiers!.map((m: { qty: number }) => m.qty)).toEqual([2, 2]);
  });
});

describe("saved order → cart", () => {
  const p = product({ vatValue: 10 });
  const items = () => [line({ quantity: 2, extras: [cheese(3), bacon(2)], modifiers: [noOnion(2)] }, p)];

  it("Recall → Edit: qtys and prices come back and the total is what was saved", () => {
    const { payload } = save(items());
    const state = loadSaved(storedFrom(payload), [p]);
    const row = state.cartItems[0];
    expect(row.extras!.map((e) => [e.id, e.qty])).toEqual([[11, 3], [12, 2]]);
    expect(row.extras![0].price).toBeCloseTo(2, 6);
    expect(row.extras![1].price).toBeCloseTo(1.5, 6);
    expect(row.modifiers!.map((m) => [m.id, m.qty])).toEqual([[21, 2]]);
    expect(selectCartCalculation({ pos: { ...state, isCartModified: true } } as never).summary.grandTotal).toBeCloseTo(payload.netAmount, 6);
  });

  it("one more extra on a saved line raises the total by that extra only", () => {
    const { payload } = save(items());
    let state = loadSaved(storedFrom(payload), [p]);
    const row = state.cartItems[0];
    state = posReducer(state, setItemCustomizations({ uniqueId: row.uniqueId, extras: addCustomization(row.extras!, cheese(1, 99)) as never }));
    expect(selectCartCalculation({ pos: state } as never).summary.grandTotal).toBeCloseTo(payload.netAmount + 2, 6);
  });

  it("one less extra lowers it; removing the last one takes all of it off", () => {
    const { payload } = save(items());
    let state = loadSaved(storedFrom(payload), [p]);
    const row = state.cartItems[0];
    state = posReducer(state, setItemCustomizations({ uniqueId: row.uniqueId, extras: changeCustomizationQty(row.extras!, 11, -1) as never }));
    expect(selectCartCalculation({ pos: state } as never).summary.grandTotal).toBeCloseTo(payload.netAmount - 2, 6);
    state = posReducer(state, setItemCustomizations({ uniqueId: row.uniqueId, extras: removeCustomization(row.extras!, 11) as never }));
    expect(selectCartCalculation({ pos: state } as never).summary.grandTotal).toBeCloseTo(payload.netAmount - 6, 6);
  });

  it("the row repeated by the backend is counted once: qty stays 3", () => {
    const { payload } = save(items());
    const stored = storedFrom(payload);
    const repeated = { ...stored, modifiersData: [...stored.modifiersData, ...stored.modifiersData.map((m) => ({ ...m }))] };
    expect(dedupeModifierRows(repeated.modifiersData).map((m) => m.qty)).toEqual([3, 2, 2]);
    const row = loadSaved(repeated, [p]).cartItems[0];
    expect(row.extras!.map((e) => e.qty)).toEqual([3, 2]);
    expect(row.modifiers![0].qty).toBe(2);
  });

  it("the product price is what remains after all extras at their qty", () => {
    const { payload } = save(items());
    const stored = storedFrom(payload);
    const pricing = storedLineToCartPricing(stored as never, stored.detailsData[0], "Exclusive", { productIsInclusive: true, discountCalc: "Inclusive", isBillDiscount: false });
    expect(pricing.price).toBeCloseTo(10, 6);
    expect(pricing.extraGrossById.get(11)).toBeCloseTo(2, 6);
  });

  it("combine path: the mapper keeps the qty", () => {
    const { payload } = save(items());
    const stored = storedFrom(payload);
    const [row] = mapOrderDetailsToCartItems(stored.detailsData, stored.modifiersData, { products: [p], productCache: { 7: p } });
    expect(row.extras!.map((e) => e.qty)).toEqual([3, 2]);
    expect(row.modifiers!.map((m) => m.qty)).toEqual([2]);
  });

  it("an older saved order with qty 1 behaves as before", () => {
    const { payload } = save([line({ extras: [cheese(1)] }, p)]);
    const state = loadSaved(storedFrom(payload), [p]);
    expect(state.cartItems[0].extras![0].qty).toBe(1);
    expect(selectCartCalculation({ pos: { ...state, isCartModified: true } } as never).summary.grandTotal).toBeCloseTo(12, 6);
  });
});

describe("prints", () => {
  const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const lines = () => calculateOrder([line({ extras: [cheese(2)], modifiers: [noOnion(3)] })] as never, takeOut as never).lines;
  const data = { orderNo: "1", orderType: "TakeOut", orderTypeId: 2, printPrice: "Inclusive" } as never;

  it("kitchen ticket shows both quantities", async () => {
    const t = text(await generateKotHtml(lines() as never, data));
    expect(t).toContain("+ CHEESE (x2)");
    expect(t).toContain("* 3 X NO ONION");
  });

  it("other kitchen items on a ticket show the modifier quantity", async () => {
    const t = text(await generateKotHtml([] as never, { orderNo: "1", otherKitchenItemEnabled: true, otherKitchenItems: lines() } as never));
    expect(t).toContain("* 3 X ONION");
  });

  it("guest bill shows both quantities and the total includes the extras", async () => {
    const t = text(await generateGuestPrintHtml(lines() as never, data));
    expect(t).toContain("+ CHEESE (x2)");
    expect(t).toContain("* 3 X NO ONION");
    expect(t).toContain("14.000");
  });

  it("thermal bill and thermal kitchen ticket show both quantities", () => {
    for (const markup of [generateBillMarkup({ cartDetails: lines() as never, data }), generateKotMarkup({ cartDetails: lines() as never, data })]) {
      expect(markup).toContain("+ CHEESE (x2)");
      expect(markup).toMatch(/3 x /i);
    }
  });

  it("saved order print: extras counted at their qty, once", () => {
    const { payload } = save([line({ extras: [cheese(2)] }, product({ vatValue: 10 }))]);
    const stored = storedFrom(payload);
    const repeated = { ...stored, modifiersData: [...stored.modifiersData, ...stored.modifiersData] };
    const printed = buildPrintPricing(repeated as never, { dataView: "Exclusive", printPrice: "Inclusive", orderType: "TakeOut", products: [product({ vatValue: 10 })] } as never);
    expect(printed.lines[0].getAmount(true)).toBeCloseTo(14, 4);
    expect(printed.lines[0].extras[0].qty).toBe(2);
  });

  it("re-order ticket prints the extras as attached to the line", () => {
    const [row] = buildReorderItems([{ ...lines()[0], isExisting: true, quantity: 3, originalQty: 1 }] as never) as ReturnType<typeof lines>;
    expect(row.quantity).toBe(2);
    expect(row.extras[0].qty).toBe(2);
    expect(row.modifiers[0].qty).toBe(3);
  });

  it("modifier label", () => {
    expect(formatModifierLabel("No", "Onion", { qty: 3, upperCase: true })).toBe("3 X NO ONION");
    expect(formatModifierLabel("No", "Onion", { qty: 1 })).toBe("No Onion");
  });
});

describe("void of a saved line", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => createElement(Provider, { store, children });
  const saved = (quantity: number) => ({
    ...calculateOrder([line({ quantity, extras: [cheese(3)], modifiers: [noOnion(2)] })] as never, takeOut as never).lines[0],
    isExisting: true, originalQty: quantity, mapId: 1,
  });
  const run = (item: unknown) => {
    const addVoidProduct = vi.fn();
    const addVoidModifier = vi.fn();
    const removeItem = vi.fn();
    const decrementItem = vi.fn();
    const { result } = renderHook(() => usePosVoidFlow({
      cartDetails: [item] as never[], editingOrderId: 500, addVoidProduct, addVoidModifier, removeItem, decrementItem,
      requestAuthorization: (o: { onAuthorized: () => void }) => o.onAuthorized(),
      selectedKey: null, setSelectedKey: vi.fn(), showToast: vi.fn(),
    }), { wrapper });
    return { result, addVoidProduct, addVoidModifier, removeItem, decrementItem };
  };

  it("voiding the whole line voids all extras at their qty, at exclusive amounts", () => {
    const { result, addVoidProduct, addVoidModifier, removeItem } = run(saved(1));
    act(() => result.current.handleRemoveItem("a"));
    act(() => result.current.voidConfirmState.onConfirmed());
    expect(removeItem).toHaveBeenCalledWith("a");
    expect(addVoidProduct.mock.calls[0][0].extras[0].qty).toBe(3);
    expect(addVoidModifier.mock.calls[0][0]).toMatchObject({ modifierId: 11, qty: 3, amount: 6 });
    expect(addVoidModifier.mock.calls[1][0]).toMatchObject({ modifierId: 21, qty: 2, amount: 0 });
  });

  it("voiding one unit of several leaves the extras on the line and out of the void", () => {
    const { result, addVoidProduct, addVoidModifier, decrementItem } = run(saved(2));
    act(() => result.current.handleDecrementItem("a"));
    expect(decrementItem).toHaveBeenCalledWith("a");
    const voided = addVoidProduct.mock.calls[0][0];
    expect(voided.extras).toEqual([]);
    expect(voided.amount).toBeCloseTo(10, 6);
    expect(voided.pricedLine.lineNet).toBeCloseTo(10, 6);
    expect(addVoidModifier.mock.calls.every(([m]) => m.amount === 0)).toBe(true);
  });

  it("voided portion priced by the engine at the extra's qty", () => {
    const line0 = saved(1).pricedLine;
    const voided = priceVoidedPortion(line0!, 1, [{ price: 2, qty: 3 }], { serviceChargeRate: 0, levyRate: 0, defaultVatRate: 0, vatEnabled: true, priceView: "Inclusive", discountCalculation: "Inclusive" } as never);
    expect(voided.extras[0].baseAmount).toBeCloseTo(6, 6);
  });
});

describe("Customise screen", () => {
  const twoLines = () => [
    { uniqueId: "a", productId: 7, quantity: 1, price: 10, lineTotal: 10, product: { name: "Burger", categoryId: 1, price: 10 }, extras: [], modifiers: [], messages: [] },
    { uniqueId: "b", productId: 8, quantity: 1, price: 5, lineTotal: 5, product: { name: "Wrap", categoryId: 1, price: 5 }, extras: [], modifiers: [], messages: [] },
  ];
  const open = (props: Record<string, unknown> = {}) => {
    const onDone = vi.fn();
    const onClose = vi.fn();
    render(createElement(Provider, {
      store,
      children: createElement(PosExtrasModifierModal, { isOpen: true, onClose, type: "extras", cartItems: twoLines(), selectedKey: "a", onSelectRow: vi.fn(), onDone, ...props } as never),
    }));
    return { onDone, onClose };
  };
  const tile = async (label: string) => screen.findByRole("button", { name: new RegExp(`^(×[0-9]+ )?${label}`) });
  const done = () => fireEvent.click(screen.getByRole("button", { name: /^Done/ }));

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mock(menuApi.getExtraTypes).mockResolvedValue([{ typeId: 1, typeName: "Toppings" }]);
    mock(menuApi.getExtras).mockResolvedValue({ extras: [{ extrasId: 11, extraName: "Cheese", price: 2 }, { extrasId: 12, extraName: "Bacon", price: 1.5 }] });
    mock(menuApi.getModifierTypes).mockResolvedValue([{ typeId: 3, typeName: "No" }]);
    mock(menuApi.getModifiers).mockResolvedValue({ modifier: [{ modifierId: 21, modifierName: "Onion" }] });
  });

  it("each tap adds one; the tile shows the qty; Done sends one entry with that qty", async () => {
    const { onDone } = open();
    const cheeseTile = await tile("Cheese");
    fireEvent.click(cheeseTile);
    fireEvent.click(cheeseTile);
    fireEvent.click(cheeseTile);
    await waitFor(() => expect(within(cheeseTile).getByText("×3")).toBeTruthy());
    expect(screen.getByLabelText("Cheese quantity").textContent).toBe("3");
    done();
    const [change] = onDone.mock.calls[0][0];
    expect(change.uniqueId).toBe("a");
    expect(change.extras).toHaveLength(1);
    expect(change.extras[0]).toMatchObject({ id: 11, name: "Cheese", price: 2, qty: 3 });
  });

  it("+ and − change the qty; − at 1 removes the extra", async () => {
    open();
    fireEvent.click(await tile("Cheese"));
    fireEvent.click(screen.getByRole("button", { name: "One more Cheese" }));
    expect(screen.getByLabelText("Cheese quantity").textContent).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "One less Cheese" }));
    expect(screen.getByLabelText("Cheese quantity").textContent).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "One less Cheese" }));
    expect(screen.queryByLabelText("Cheese quantity")).toBeNull();
  });

  it("the extra's row shows price × qty", async () => {
    open();
    const cheeseTile = await tile("Cheese");
    fireEvent.click(cheeseTile);
    fireEvent.click(cheeseTile);
    const row = screen.getByLabelText("Cheese quantity").parentElement!.parentElement!;
    expect(row.textContent).toContain("4.000");
  });

  it("the remove button takes the whole qty off", async () => {
    open();
    const cheeseTile = await tile("Cheese");
    fireEvent.click(cheeseTile);
    fireEvent.click(cheeseTile);
    fireEvent.click(screen.getByRole("button", { name: "Remove Cheese" }));
    expect(screen.queryByLabelText("Cheese quantity")).toBeNull();
  });

  it("adding then taking off again is no change: Done sends nothing", async () => {
    const { onDone, onClose } = open();
    fireEvent.click(await tile("Cheese"));
    fireEvent.click(screen.getByRole("button", { name: "One less Cheese" }));
    done();
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("Cancel discards the changes", async () => {
    const { onDone, onClose } = open();
    fireEvent.click(await tile("Cheese"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("each line keeps its own qty", async () => {
    const { onDone } = open();
    const cheeseTile = await tile("Cheese");
    fireEvent.click(cheeseTile);
    fireEvent.click(cheeseTile);
    fireEvent.click(screen.getAllByText("Wrap")[0]);
    await waitFor(() => expect(within(cheeseTile).queryByText("×2")).toBeNull());
    fireEvent.click(await tile("Cheese"));
    done();
    const changes = Object.fromEntries(onDone.mock.calls[0][0].map((c: { uniqueId: string; extras: { qty: number }[] }) => [c.uniqueId, c.extras[0].qty]));
    expect(changes).toEqual({ a: 2, b: 1 });
  });

  it("different extras on one line each have their own qty", async () => {
    const { onDone } = open();
    fireEvent.click(await tile("Cheese"));
    fireEvent.click(await tile("Cheese"));
    fireEvent.click(await tile("Bacon"));
    done();
    expect(onDone.mock.calls[0][0][0].extras.map((e: { id: number; qty: number }) => [e.id, e.qty])).toEqual([[11, 2], [12, 1]]);
  });

  it("modifiers take a qty too, with their type", async () => {
    const { onDone } = open({ type: "modifiers" });
    const onionTile = await tile("Onion");
    fireEvent.click(onionTile);
    fireEvent.click(onionTile);
    await waitFor(() => expect(within(onionTile).getByText("×2")).toBeTruthy());
    done();
    expect(onDone.mock.calls[0][0][0].modifiers[0]).toMatchObject({ id: 21, qty: 2, typeId: 3, typeName: "No" });
  });

  it("a saved extra adds to its qty and keeps its saved price", async () => {
    const lines = twoLines();
    lines[0].extras = [cheese(2, 1.75)] as never[];
    const { onDone } = open({ cartItems: lines });
    fireEvent.click(await tile("Cheese"));
    done();
    expect(onDone.mock.calls[0][0][0].extras).toEqual([cheese(3, 1.75)]);
  });

  it("a saved modifier returned with another type id still adds to its qty, not a second entry", async () => {
    const lines = twoLines();
    lines[0].modifiers = [{ id: 21, name: "Onion", qty: 1, typeId: 1, typeName: "No" }] as never[];
    const { onDone } = open({ cartItems: lines, type: "modifiers" });
    fireEvent.click(await tile("Onion"));
    done();
    const { modifiers } = onDone.mock.calls[0][0][0];
    expect(modifiers).toHaveLength(1);
    expect(modifiers[0].qty).toBe(2);
  });

  it("switching to a tab with no types shows the empty message, not a spinner that never ends", async () => {
    mock(menuApi.getModifierTypes).mockResolvedValue([]);
    open();
    await tile("Cheese");
    fireEvent.click(screen.getByRole("tab", { name: /Modifiers/ }));
    expect(await screen.findByText("No modifiers for this product")).toBeTruthy();
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("messages on the line are left alone", async () => {
    const lines = twoLines();
    lines[0].messages = [{ name: "Well done" }] as never[];
    const { onDone } = open({ cartItems: lines });
    fireEvent.click(await tile("Cheese"));
    done();
    expect(onDone.mock.calls[0][0][0].messages).toEqual([{ name: "Well done" }]);
  });
});
