/**
 * GOLDEN ORDERS — real orders saved by the backend (order_data, priceView=Exclusive).
 * The cart → payload path must reproduce the stored values exactly.
 * Do not change expected numbers unless the backend data changes.
 */
import { describe, it, expect } from "vitest";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";

const session: any = { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-03T00:00:00.000Z" };

const setConfig = (sc: number, levy: number) => {
  localStorage.clear();
  localStorage.setItem("enableVat", "true");
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("printPrice", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem(
    "posConfigs",
    JSON.stringify({ configs: { discountCalc: "Inclusive", priceView: "Inclusive", serviceCharges: sc, levy, vatStatus: true } })
  );
};

const checkout = (items: any[], orderType: string, orderTypeId: number, bill?: { value: number; type: "percentage" | "amount" }) => {
  const calc = calculateOrder(items, {
    orderType,
    orderTypeId,
    billDiscountValue: bill?.value ?? 0,
    billDiscountType: bill?.type ?? "percentage",
  });
  const payload = buildDirectSettleOrderPayload(
    {
      cartDetails: calc.lines,
      tax: calc.summary.vatAmount,
      total: calc.summary.grandTotal,
      deliveryCharge: calc.summary.deliveryCharge,
      selectedOrderTypeName: orderType,
      selectedOrderTypeId: orderTypeId,
      billDiscountValue: bill?.value ?? 0,
      billDiscountType: bill?.type ?? "percentage",
    } as any,
    session
  );
  return { calc, payload };
};

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const DEMO = { id: 6, name: "Demo", price: 10, vatValue: 10, isIncl: false };

describe("golden orders (backend order_data)", () => {
  it("Order #283 — DineIn, SC 10%, levy 5%, ABCd 100.000 incl + extra 5.000", () => {
    setConfig(10, 5);
    const { calc, payload } = checkout(
      [{ uniqueId: "1", productId: 9, quantity: 1, price: 100, isIncl: true, product: ABCD, extras: [{ id: 1, name: "aa", price: 5, qty: 1, typeId: 2 }] }],
      "DineIn",
      1
    );
    const d = payload.details[0];
    expect(d.price).toBeCloseTo(82.6446281, 6);
    expect(payload.modifiers[0].price).toBeCloseTo(3.9354585, 6);
    expect(d.serviceCharge).toBeCloseTo(8.2644628, 6);
    expect(d.levy).toBeCloseTo(4.5454545, 6);
    expect(d.vatAmount).toBeCloseTo(9.5454545, 6);
    expect(payload.vatExclAmount).toBeCloseTo(95.4545455, 6);
    expect(payload.vatAmount).toBeCloseTo(9.5454545, 6);
    expect(payload.netAmount).toBeCloseTo(105, 6);
    expect(calc.summary.grandTotal).toBeCloseTo(105, 6);
  });

  it("Order #284 — TakeOut, item discount 1.000 (inclusive) on Demo 10.000 excl", () => {
    setConfig(0, 0);
    const { calc, payload } = checkout(
      [{ uniqueId: "1", productId: 6, quantity: 1, price: 10, isIncl: false, product: DEMO, discountValue: 1, discountType: "amount" }],
      "TakeOut",
      2
    );
    const d = payload.details[0];
    expect(d.price).toBeCloseTo(10, 6);
    expect(d.discAmount).toBeCloseTo(0.9090909, 6);
    expect(d.vatAmount).toBeCloseTo(0.9090909, 6);
    expect(payload.discAmount).toBe(0); // item discounts are not written to the master
    expect(payload.vatExclAmount).toBeCloseTo(9.0909091, 6);
    expect(payload.vatAmount).toBeCloseTo(0.9090909, 6);
    expect(payload.netAmount).toBeCloseTo(10, 6);
    expect(calc.summary.grandTotal).toBeCloseTo(10, 6);
  });

  it("Order #285 — TakeOut, bill discount 10%, 3× ABCd incl + 3× Demo excl", () => {
    setConfig(0, 0);
    const { calc, payload } = checkout(
      [
        { uniqueId: "1", productId: 9, quantity: 3, price: 100, isIncl: true, product: ABCD },
        { uniqueId: "2", productId: 6, quantity: 3, price: 10, isIncl: false, product: DEMO },
      ],
      "TakeOut",
      2,
      { value: 10, type: "percentage" }
    );
    const [a, b] = payload.details;
    expect(a.price).toBeCloseTo(90.9090909, 6);
    expect(a.discAmount).toBeCloseTo(27.2727273, 6);
    expect(a.vatAmount).toBeCloseTo(24.5454545, 6);
    expect(b.price).toBeCloseTo(10, 6);
    expect(b.discAmount).toBeCloseTo(3, 6);
    expect(b.vatAmount).toBeCloseTo(2.7, 6);
    expect(payload.discAmount).toBeCloseTo(30.2727273, 6);
    expect(payload.vatExclAmount).toBeCloseTo(272.4545454, 6);
    expect(payload.vatAmount).toBeCloseTo(27.2454545, 6);
    expect(payload.netAmount).toBeCloseTo(299.7, 6);
    expect(calc.summary.grandTotal).toBeCloseTo(299.7, 6);
  });
});
