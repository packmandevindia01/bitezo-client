/**
 * Provider orders show the provider's own menu (checked on backend 8060, 2026-11-12): the server keys it by the provider
 * id sent as the menu's orderTypeId — Swiggy (5) and Zomato (6) each get their own products and prices.
 */
import { describe, it, expect } from "vitest";
import posReducer, { setMenuProviderId, setOrderType, loadRecalledOrder, clearCart } from "../features/pos/terminal/store/posSlice";
import { fixProviderMenuProducts, isProviderMenuOrderType } from "../features/pos/services/menuApi";
import { selectMenuOrderTypeId } from "../features/pos/terminal/store/posSelectors";

const stateWith = (...actions: Parameters<typeof posReducer>[1][]) => {
  const pos = actions.reduce(posReducer, posReducer(undefined, { type: "@@init" } as never));
  return { pos } as never;
};

describe("selectMenuOrderTypeId", () => {
  it("provider order: the provider's id (Zomato 6, not the generic 5)", () => {
    const s = stateWith(setOrderType({ orderTypeId: 5, orderType: "Zomato" }), setMenuProviderId(6));
    expect(selectMenuOrderTypeId(s)).toBe(6);
  });

  it("provider order for Swiggy (id 5) stays 5", () => {
    const s = stateWith(setOrderType({ orderTypeId: 5, orderType: "Swiggy" }), setMenuProviderId(5));
    expect(selectMenuOrderTypeId(s)).toBe(5);
  });

  it("any other order type: that order type, even if a provider id is left over", () => {
    const s = stateWith(setMenuProviderId(6), setOrderType({ orderTypeId: 2, orderType: "TakeOut" }));
    expect(selectMenuOrderTypeId(s)).toBe(2);
  });

  it("type 5 without a provider (e.g. a recalled provider order): 5", () => {
    const s = stateWith(setOrderType({ orderTypeId: 5, orderType: "Providers" }), setMenuProviderId(null));
    expect(selectMenuOrderTypeId(s)).toBe(5);
  });

  it("an invalid provider id is ignored", () => {
    const s = stateWith(setOrderType({ orderTypeId: 5, orderType: "Providers" }), setMenuProviderId(0));
    expect(selectMenuOrderTypeId(s)).toBe(5);
  });
});

/** Backend 8060, 2026-11-12: General category products for Zomato (6) came back once per provider, only the price differs. */
const generalRowsFromServer = [
  { id: 3, name: "Test(2)", price: 9 }, { id: 3, name: "Test(2)", price: 10 },
  { id: 8, name: "masala dosa", price: 25 }, { id: 8, name: "masala dosa", price: 20 },
  { id: 5, name: "Burgers", price: 1 }, { id: 5, name: "Burgers", price: 1 },
  { id: 99, name: "Not on Zomato", price: 4 },
];
/** product-list for Zomato (correct per provider). */
const zomatoPrices = new Map([[3, 10], [8, 20], [5, 1]]);

describe("provider menu workaround (until products / product data filter by provider)", () => {
  it("own menu on: one row per product, only the provider's products, at its prices", () => {
    expect(fixProviderMenuProducts(generalRowsFromServer, zomatoPrices, true)).toEqual([
      { id: 3, name: "Test(2)", price: 10 },
      { id: 8, name: "masala dosa", price: 20 },
      { id: 5, name: "Burgers", price: 1 },
    ]);
  });

  it("own menu off: every product once, the provider's price where it has one", () => {
    const rows = fixProviderMenuProducts(generalRowsFromServer, zomatoPrices, false);
    expect(rows.map((r) => [r.id, r.price])).toEqual([[3, 10], [8, 20], [5, 1], [99, 4]]);
  });

  it("no provider list (lookup failed): rows unchanged rather than an empty menu", () => {
    expect(fixProviderMenuProducts(generalRowsFromServer, new Map(), true)).toBe(generalRowsFromServer);
  });

  it("order types 1–4 are not provider menus; 5 and up are provider ids", () => {
    expect([1, 2, 3, 4].map(isProviderMenuOrderType)).toEqual([false, false, false, false]);
    expect([5, 6, 12].map(isProviderMenuOrderType)).toEqual([true, true, true]);
  });
});

describe("recalled provider order", () => {
  const recalled = (providerId?: number | null) =>
    loadRecalledOrder({ editingOrderId: 70, cartItems: [], orderTypeId: 5, orderTypeName: "Providers", customerId: 1, addressId: 0, billDiscountValue: 0, billDiscountType: "percentage", providerId } as never);

  it("keeps the saved provider, so the menu is that provider's (Zomato 6)", () => {
    expect(selectMenuOrderTypeId(stateWith(recalled(6)))).toBe(6);
  });

  it("an order saved without a provider id falls back to type 5", () => {
    expect(selectMenuOrderTypeId(stateWith(recalled(undefined)))).toBe(5);
  });

  it("a new cart forgets the provider", () => {
    expect(stateWith(recalled(6), clearCart()) as unknown as { pos: { menuProviderId: number | null } }).toMatchObject({ pos: { menuProviderId: null } });
  });
});
