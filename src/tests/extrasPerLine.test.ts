/**
 * EXTRAS ARE PER LINE: 3 × item + 1 extra → the extra is charged ONCE (qty 1), not 3 times.
 * Checks cart, order payload sent to the backend, and sales invoice payload.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { buildSalesInvoicePayload } from "../features/pos/terminal/mappers/invoicePayloadMapper";

const TP = { id: 7, name: "Test Price", price: 100, vatValue: 10, isIncl: true };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
});

describe("3 × Test Price (100.000 incl) + 1 extra 5.500", () => {
  const run = () => {
    const items = [{ uniqueId: "a", productId: 7, quantity: 3, price: 100, isIncl: true, product: TP, extras: [{ id: 11, name: "Extras", price: 5.5, qty: 1, typeId: 2 }] }];
    const calc = calculateOrder(items, { orderType: "TakeOut", orderTypeId: 2 });
    const payload = buildDirectSettleOrderPayload({
      cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal, deliveryCharge: 0,
      selectedOrderTypeName: "TakeOut", selectedOrderTypeId: 2, billDiscountValue: 0, billDiscountType: "percentage",
    } as any, { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-03" } as any);
    const invoice = buildSalesInvoicePayload({ orderPayload: payload, payments: [{ paymodeId: 1, amount: payload.netAmount }], employeeId: 1, dayId: 1, shiftId: 1, transDate: "2026-11-03" });
    return { calc, payload, invoice };
  };

  it("cart: 3 × 100.000 + 5.500 once = 305.500", () => {
    expect(run().calc.summary.grandTotal).toBeCloseTo(305.5, 6);
  });

  it("order payload: extra row qty 1 (exclusive 5.000), detail qty 3, price includes the extra spread per unit", () => {
    const { payload } = run();
    expect(payload.modifiers).toHaveLength(1);
    expect(payload.modifiers[0]).toMatchObject({ modifierId: 11, qty: 1 });
    expect(payload.modifiers[0].price).toBeCloseTo(5, 6);    // 5.500 / 1.1
    expect(payload.modifiers[0].amount).toBeCloseTo(5, 6);   // × qty 1 — NOT × 3
    expect(payload.details[0].qty).toBe(3);
    expect(payload.details[0].price).toBeCloseTo((3 * 100 / 1.1 + 5) / 3, 6); // (product base × 3 + extra base) / 3
    expect(payload.netAmount).toBeCloseTo(305.5, 6);
  });

  it("sales invoice: same total 305.500, same single extra", () => {
    const { invoice } = run();
    expect(invoice.netAmount).toBeCloseTo(305.5, 6);
    expect(invoice.modifiers).toHaveLength(1);
    expect(invoice.modifiers![0].qty).toBe(1);
  });
});
