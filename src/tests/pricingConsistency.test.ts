/**
 * Cart screen ⇄ backend payload consistency.
 * The payload must store exactly what the cart shows, and the master totals
 * must be the sums of the detail rows.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";

const session: any = { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-03T00:00:00.000Z" };

const setConfig = (configs: Record<string, unknown>, vatOn = true) => {
  localStorage.clear();
  localStorage.setItem("vatStatus", vatOn ? "true" : "false");
  localStorage.setItem("posConfigs", JSON.stringify({ configs }));
  localStorage.setItem("priceView", String(configs.priceView ?? "Exclusive"));
  localStorage.setItem("discCalc", String(configs.discCalc ?? "Exclusive"));
};

/** Mimics the real app: selectors → context → payload. */
const checkout = (
  items: any[],
  orderTypeName: string,
  orderTypeId: number,
  bill?: { value: number; type: "percentage" | "amount" }
) => {
  const calc = calculateOrder(items, {
    orderType: orderTypeName,
    orderTypeId,
    billDiscountValue: bill?.value ?? 0,
    billDiscountType: bill?.type ?? "percentage",
  });
  const context: any = {
    cartDetails: calc.lines,
    tax: calc.summary.vatAmount,
    total: calc.summary.grandTotal,
    deliveryCharge: calc.summary.deliveryCharge,
    selectedOrderTypeName: orderTypeName,
    selectedOrderTypeId: orderTypeId,
    billDiscountValue: bill?.value ?? 0,
    billDiscountType: bill?.type ?? "percentage",
  };
  return { calc, payload: buildDirectSettleOrderPayload(context, session) };
};

const sumDetails = (payload: any, key: string) =>
  payload.details.reduce((s: number, d: any) => s + Number(d[key] || 0), 0);

const expectConsistent = (calc: any, payload: any) => {
  expect(payload.netAmount).toBeCloseTo(calc.summary.grandTotal, 6);
  expect(payload.vatAmount).toBeCloseTo(sumDetails(payload, "vatAmount"), 6);
  expect(payload.serviceCharge).toBeCloseTo(sumDetails(payload, "serviceCharge"), 6);
  expect(payload.levy).toBeCloseTo(sumDetails(payload, "levy"), 6);
  expect(payload.vatExclAmount + payload.vatAmount + payload.deliveryCharge).toBeCloseTo(payload.netAmount, 6);
  // each detail: price×qty − disc + sc + levy + vat = netAmount
  payload.details.forEach((d: any) => {
    expect(d.price * d.qty - d.discAmount + d.serviceCharge + d.levy + d.vatAmount).toBeCloseTo(d.netAmount, 6);
  });
};

describe("cart ⇄ payload consistency", () => {
  beforeEach(() => setConfig({ serviceCharges: 10, levy: 5, vat: 10 }));

  it("Dine-In inclusive item + extras + item discount", () => {
    const items = [
      {
        uniqueId: "a", productId: 1, quantity: 2, price: 12.705, isIncl: true,
        product: { id: 1, name: "Burger", price: 12.705, vatValue: 10, isIncl: true },
        extras: [{ id: 9, name: "Cheese", price: 1.2705, qty: 2, typeId: 2 }],
        discountValue: 10, discountType: "percentage",
      },
      { uniqueId: "b", productId: 2, quantity: 1, price: 3, isIncl: false, product: { id: 2, name: "Tea", price: 3, vatValue: 10, isIncl: false } },
    ];
    const { calc, payload } = checkout(items, "DineIn", 1);
    expectConsistent(calc, payload);
    // extras row price is the exclusive price: 1.2705 / 1.2705 = 1.000
    expect(payload.modifiers[0].price).toBeCloseTo(1, 6);
    // detail price = (product base + extras base) per unit = 10 + 2/2 = 11
    expect(payload.details[0].price).toBeCloseTo(11, 6);
  });

  it("mixed VAT rates + bill discount: master VAT is the sum of lines (was global-rate VAT)", () => {
    const items = [
      { uniqueId: "a", productId: 1, quantity: 1, price: 100, isIncl: false, product: { id: 1, name: "Taxed", price: 100, vatValue: 10 } },
      { uniqueId: "b", productId: 2, quantity: 1, price: 100, isIncl: false, product: { id: 2, name: "Zero-rated", price: 100, vatValue: 0 } },
    ];
    const { calc, payload } = checkout(items, "TakeOut", 2, { value: 10, type: "percentage" });
    expectConsistent(calc, payload);
    // base 200 − 20 = 180, levy 5% = 9; VAT only on the taxed half: (90 + 4.5) × 10% = 9.45
    expect(payload.vatAmount).toBeCloseTo(9.45, 6);
    expect(payload.netAmount).toBeCloseTo(198.45, 6);
    expect(payload.discAmount).toBeCloseTo(20, 6);
  });

  it("VAT disabled + levy + extras: extras stored with the same factor as the cart", () => {
    setConfig({ serviceCharges: 0, levy: 5 }, false);
    const items = [
      {
        uniqueId: "a", productId: 1, quantity: 1, price: 10.5, isIncl: true,
        product: { id: 1, name: "Item", price: 10.5, isIncl: true },
        extras: [{ id: 3, name: "Extra", price: 1.05, qty: 1, typeId: 2 }],
      },
    ];
    const { calc, payload } = checkout(items, "TakeOut", 2);
    expectConsistent(calc, payload);
    expect(payload.vatAmount).toBe(0);
    expect(payload.modifiers[0].price).toBeCloseTo(1, 6);
    expect(payload.details[0].price).toBeCloseTo(11, 6);
    expect(payload.netAmount).toBeCloseTo(11.55, 6);
  });

  it("inclusive bill discount (typed 10.000) reduces payable by exactly 10.000", () => {
    setConfig({ serviceCharges: 10, levy: 5, discCalc: "Inclusive" });
    const items = [
      { uniqueId: "a", productId: 1, quantity: 3, price: 33.3, isIncl: true, product: { id: 1, name: "DEMO", price: 33.3, vatValue: 10, isIncl: true } },
    ];
    const { calc, payload } = checkout(items, "DineIn", 1, { value: 10, type: "amount" });
    expectConsistent(calc, payload);
    expect(payload.netAmount).toBeCloseTo(89.9, 6);
  });

  it("Delivery: delivery charge is added once, untaxed", () => {
    setConfig({ serviceCharges: 10, levy: 0, deliveryCharge: 1 });
    const items = [{ uniqueId: "a", productId: 1, quantity: 1, price: 5, isIncl: false, product: { id: 1, name: "X", price: 5, vatValue: 10 } }];
    const { calc, payload } = checkout(items, "Delivery", 4);
    expectConsistent(calc, payload);
    expect(payload.serviceCharge).toBe(0);
    expect(payload.netAmount).toBeCloseTo(6.5, 6);
  });
});

describe("sales invoice VAT", () => {
  it("zero-rated items are not floored to 10% VAT on the invoice", () => {
    setConfig({ serviceCharges: 0, levy: 0 });
    const items = [{ uniqueId: "a", productId: 1, quantity: 1, price: 100, isIncl: false, product: { id: 1, name: "Zero", price: 100, vatValue: 0 } }];
    const { payload } = checkout(items, "TakeOut", 2);
    const invoice = buildSalesInvoicePayload({
      orderPayload: payload,
      payments: [{ paymodeId: 1, amount: payload.netAmount }],
      employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-03",
    });
    expect(invoice.vatAmount).toBe(0);
    expect(invoice.netAmount).toBeCloseTo(100, 6);
  });
});
