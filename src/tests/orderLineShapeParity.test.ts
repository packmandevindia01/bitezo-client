/**
 * The new line shape must say exactly what the old pricing code said about what was ordered: names, quantities,
 * extras, modifiers, messages and flags. Seeded random saved orders, and a fixed set of awkward ones.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildUnifiedOrderPricing } from "../features/pos/utils/orderPricing";
import { buildOrderLineShapes, orderHasBillDiscount, orderHasVat } from "../features/pos/utils/orderLineShape";

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};
Object.defineProperty(globalThis, "localStorage", { value: fakeStorage, configurable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: fakeStorage, configurable: true });

const random = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const makeOrder = (seed: number) => {
  const r = random(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const count = 1 + Math.floor(r() * 4);
  const billDisc = r() < 0.3;
  const details = Array.from({ length: count }, (_, i) => ({
    mapId: i + 1,
    productId: 10 + i,
    unitId: pick([1, 2, undefined]),
    categoryId: pick([3, undefined]),
    productName: pick(["Burger", "Rice - Large", "Tea"]),
    arabicName: pick(["", "برجر"]),
    altName: pick(["", "Large"]),
    altArabic: pick(["", "كبير"]),
    qty: pick([1, 2, 3, 0]),
    price: pick([1.1, 2.5, 7]),
    amount: pick([1.1, 5, 14]),
    discAmount: !billDisc && r() < 0.3 ? 0.5 : 0,
    vatAmount: pick([0, 0.11]),
    vatValue: pick([0, 10, undefined]),
    netAmount: pick([1.21, 5.5]),
    isIncl: pick([true, false, undefined]),
    complimentaryStatus: r() < 0.05,
  }));
  const modifiers = details.flatMap((d) => {
    const rows = [];
    if (r() < 0.5) rows.push({ mapId: d.mapId, modifierId: 6, modifierName: "Cheese", status: "Extras", price: 0.5, qty: 2, typeId: 2 });
    if (r() < 0.5) rows.push({ mapId: d.mapId, modifierId: 8, modifierName: "No Salt", status: "Modifier", price: 0, qty: 1, typeId: 1, typeName: "Taste" });
    if (r() < 0.5) rows.push({ mapId: d.mapId, modifierId: 0, modifierName: "Hot", status: "Message", price: 0, qty: 1, typeId: 1 });
    if (r() < 0.2 && rows.length) rows.push({ ...rows[0] });
    return rows;
  });
  const master = {
    orderId: seed + 1,
    orderType: pick(["DineIn", "TakeOut"]),
    netAmount: pick([0, 12.1, 30]),
    vatExclAmount: pick([0, 11, 27]),
    vatAmount: pick([0, 1.1, 3]),
    discAmount: billDisc ? pick([1, 2.5]) : 0,
    discPer: billDisc && r() < 0.4 ? 10 : 0,
    complimentaryStatus: r() < 0.05,
  };
  return { masterData: master, detailsData: details, modifiersData: modifiers };
};

const sameThing = (order: unknown, options?: Record<string, unknown>) => {
  const old = buildUnifiedOrderPricing(order, { priceView: "Exclusive", printPrice: "Exclusive", ...options });
  const shapes = buildOrderLineShapes(order, options);
  expect(shapes).toHaveLength(old.lines.length);
  shapes.forEach((shape, i) => {
    const line = old.lines[i];
    expect(shape).toMatchObject({
      isUnifiedPricingLine: true,
      productId: line.productId,
      isProductMasterInclusive: line.isProductMasterInclusive,
      unitId: line.unitId,
      categoryId: line.categoryId,
      productName: line.productName,
      productArabicName: line.productArabicName,
      variantName: line.variantName,
      variantArabic: line.variantArabic,
      quantity: line.quantity,
    });
    expect(shape.extras.map((e) => [e.id, e.name, e.arabicName, e.qty, e.typeId])).toEqual(line.extras.map((e) => [e.id, e.name, e.arabicName, e.qty, e.typeId]));
    expect(shape.modifiers).toEqual(line.modifiers);
    expect(shape.messages).toEqual(line.messages);
    expect(shape.rawItem).toBe(line.rawItem);
  });
  expect(orderHasBillDiscount(order, options)).toBe(old.summary.isBillDiscount);
  expect(orderHasVat(order, options)).toBe(old.summary.isVatActive);
};

beforeEach(() => store.clear());

describe("line shape matches the old code", () => {
  it("on 500 random saved orders, VAT on", () => {
    store.set("vatStatus", "true");
    store.set("enableVat", "true");
    for (let seed = 1; seed <= 500; seed++) sameThing(makeOrder(seed));
  });

  it("on 500 random saved orders, VAT off", () => {
    store.set("vatStatus", "false");
    store.set("enableVat", "false");
    for (let seed = 501; seed <= 1000; seed++) sameThing(makeOrder(seed));
  });

  it("when the caller decides the discount and VAT", () => {
    for (let seed = 1; seed <= 50; seed++) {
      sameThing(makeOrder(seed), { isBillDiscount: true, isVatActive: false });
      sameThing(makeOrder(seed), { isBillDiscount: false, isVatActive: true });
    }
  });

  it("reads inclusive products from the catalogue", () => {
    const order = makeOrder(7);
    const productCache = Object.fromEntries(order.detailsData.map((d) => [d.productId, { id: d.productId, isIncl: true, price: 3 }]));
    sameThing({ ...order, detailsData: order.detailsData.map((d) => ({ ...d, isIncl: undefined })) }, { productCache });
  });

  it("handles a plain array of lines, extras on the line, and PascalCase fields", () => {
    sameThing([{ productId: 1, ProductName: "Tea", Qty: 2, extras: [{ id: 3, name: "Sugar", price: 0.1, qty: 1 }], modifiers: [{ id: 4, name: "Hot", qty: 1 }], messages: [{ id: 5, name: "Fast" }] }], { netAmount: 5 });
  });

  it("copes with an empty or missing order", () => {
    sameThing({ masterData: {}, detailsData: [] });
    expect(buildOrderLineShapes(null)).toEqual([]);
  });
});
