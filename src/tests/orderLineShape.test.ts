/** What a line is, with no amounts: names, quantity, extras, modifiers, messages. */
import { describe, it, expect, beforeEach } from "vitest";
import { buildOrderLineShapes, orderHasBillDiscount, orderHasVat } from "../features/pos/utils/orderLineShape";

const order = (over: Record<string, unknown> = {}) => ({
  masterData: { orderId: 1, netAmount: 11, vatExclAmount: 10, vatAmount: 1, discAmount: 0, ...over },
  detailsData: [{ mapId: 1, productId: 5, unitId: 2, categoryId: 3, productName: "Rice - Large", altName: "Large", qty: 2, price: 5, amount: 10, vatAmount: 1, vatValue: 10 }],
  modifiersData: [
    { mapId: 1, modifierId: 6, modifierName: "Cheese", status: "Extras", price: 0.5, qty: 2, typeId: 2 },
    { mapId: 1, modifierId: 6, modifierName: "Cheese", status: "Extras", price: 0.5, qty: 2, typeId: 2 },
    { mapId: 1, modifierId: 8, modifierName: "No Salt", status: "Modifier", price: 0, qty: 1, typeId: 1, typeName: "Taste" },
    { mapId: 1, modifierId: 0, modifierName: "Hot", status: "Message", price: 0, qty: 1, typeId: 1 },
    { mapId: 2, modifierId: 9, modifierName: "Other line", status: "Extras", price: 1, qty: 1, typeId: 2 },
  ],
});

beforeEach(() => localStorage.clear());

describe("buildOrderLineShapes", () => {
  it("reads the line and only its own rows, counting a joined duplicate once", () => {
    const [line] = buildOrderLineShapes(order());
    expect(line).toMatchObject({ isUnifiedPricingLine: true, productId: 5, unitId: 2, categoryId: 3, variantName: "Large", quantity: 2 });
    expect(line.extras.map((e) => [e.name, e.qty])).toEqual([["Cheese", 2]]);
    expect(line.modifiers.map((m) => m.name)).toEqual(["No Salt"]);
    expect(line.messages.map((m) => m.name)).toEqual(["Hot"]);
  });

  it("handles a plain array, extras on the line and PascalCase fields", () => {
    const [line] = buildOrderLineShapes([{ productId: 1, ProductName: "Tea", Qty: 2, extras: [{ id: 3, name: "Sugar", price: 0.1, qty: 1 }], messages: [{ id: 5, name: "Fast" }] }]);
    expect(line.productName).toBe("Tea");
    expect(line.quantity).toBe(2);
    expect(line.extras.map((e) => e.name)).toEqual(["Sugar"]);
    expect(line.messages.map((m) => m.name)).toEqual(["Fast"]);
  });

  it("reads inclusive products from the catalogue", () => {
    const productCache = { 5: { id: 5, isIncl: true, price: 3 } };
    expect(buildOrderLineShapes(order(), { productCache })[0].isProductMasterInclusive).toBe(true);
  });

  it("returns a line that is already priced as it is, and copes with nothing", () => {
    const priced = { isUnifiedPricingLine: true, productId: 1 };
    expect(buildOrderLineShapes([priced])[0]).toBe(priced);
    expect(buildOrderLineShapes(null)).toEqual([]);
    expect(buildOrderLineShapes({ masterData: {}, detailsData: [] })).toEqual([]);
  });
});

describe("orderHasBillDiscount", () => {
  it("follows the caller, then the saved discount", () => {
    expect(orderHasBillDiscount(order({ discAmount: 2 }), { isBillDiscount: false })).toBe(false);
    expect(orderHasBillDiscount(order({ discAmount: 2 }))).toBe(true);
    expect(orderHasBillDiscount(order())).toBe(false);
  });
});

describe("orderHasVat", () => {
  it("follows the caller, then the VAT stored on the order", () => {
    expect(orderHasVat(order(), { isVatActive: false })).toBe(false);
    expect(orderHasVat(order())).toBe(true);
    expect(orderHasVat({ masterData: {}, detailsData: [{ productId: 1 }] })).toBe(false);
  });
});
