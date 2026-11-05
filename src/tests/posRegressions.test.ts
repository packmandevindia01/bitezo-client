/**
 * Regression tests for the POS bugs found by the cross-verification pass (2026-11-05).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { allocateBulkPayments, bulkAmountDue, orderPayable } from "../features/pos/bulkSettlement/utils/allocatePayments";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { buildDirectSettleOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import { applyStoredOrderView } from "../features/pos/services/storedOrderView";
import { loadSettledOrderIntoCart } from "../features/pos/terminal/utils/loadSettledOrderIntoCart";
import posReducer from "../features/pos/terminal/store/posSlice";
import { selectCartCalculation } from "../features/pos/terminal/store/posSelectors";

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 1000) / 1000;

describe("bulk (driver) settlement — payment allocation", () => {
  it("rounds each order HALF-UP to fils (toFixed is not half-up on floats)", () => {
    expect(orderPayable(1.0005, 3)).toBe(1.001);
    expect(orderPayable(2.6745, 3)).toBe(2.675);
    expect(orderPayable(10.12345678901234, 3)).toBe(10.123);
  });

  it("amount due = Σ rounded order totals → no phantom fil", () => {
    const orders = [{ orderId: 1, totalAmount: 1.0005 }, { orderId: 2, totalAmount: 1.0005 }];
    // raw sum 2.001 vs Σ rounded 2.002 — the due must be what the orders are allocated
    const due = bulkAmountDue(orders, 3);
    expect(due).toBe(2.002);
    const alloc = allocateBulkPayments(orders, [{ paymodeId: 1, label: "Cash", amount: due }], 0, 3);
    expect(alloc.map((a) => sum(a.paymodes.map((p) => p.amount)))).toEqual([1.001, 1.001]);
    expect(sum(alloc.flatMap((a) => a.paymodes.map((p) => p.amount)))).toBe(due);
  });

  it("change comes off the cash payment first; card stays whole", () => {
    const orders = [{ orderId: 1, totalAmount: 7.5 }, { orderId: 2, totalAmount: 4.25 }];
    const due = bulkAmountDue(orders, 3); // 11.750
    const alloc = allocateBulkPayments(
      orders,
      [{ paymodeId: 2, label: "Card", amount: 5 }, { paymodeId: 1, label: "Cash", amount: 10 }],
      3.25, // 15 paid − 11.75 due
      3,
    );
    expect(alloc[0].paymodes).toEqual([{ paymodeId: 2, amount: 5 }, { paymodeId: 1, amount: 2.5 }]);
    expect(alloc[1].paymodes).toEqual([{ paymodeId: 1, amount: 4.25 }]);
    expect(alloc[0].primaryPaymodeName).toBe("Card / Cash");
    expect(sum(alloc.flatMap((a) => a.paymodes.map((p) => p.amount)))).toBe(due);
  });

  it("every order is allocated exactly its payable amount (random orders, random tender split)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 200; run++) {
      const orders = Array.from({ length: 1 + Math.floor(rnd() * 6) }, (_, i) => ({ orderId: i + 1, totalAmount: Math.round(rnd() * 50 * 1e7) / 1e7 }));
      const due = bulkAmountDue(orders, 3);
      const card = Math.round(rnd() * due * 1000) / 1000;
      const cash = Math.round((due - card + rnd() * 5) * 1000) / 1000;
      const change = Math.max(0, Math.round((card + cash - due) * 1000) / 1000);
      const alloc = allocateBulkPayments(orders, [{ paymodeId: 2, label: "Card", amount: card }, { paymodeId: 1, label: "Cash", amount: cash }], change, 3);
      alloc.forEach((a, i) => expect(sum(a.paymodes.map((p) => p.amount))).toBe(orderPayable(orders[i].totalAmount, 3)));
    }
  });
});

describe("settled-order edit keeps an AMOUNT bill discount", () => {
  const P1 = { id: 21, name: "Burger", price: 3.5, vatValue: 10, isIncl: true };
  const P2 = { id: 22, name: "Fries", price: 1.2, vatValue: 10, isIncl: false };
  const products = [P1, P2];
  const productCache = { 21: P1, 22: P2 };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
    localStorage.setItem("decimalPart", "3");
  });

  for (const discCalc of ["Inclusive", "Exclusive"] as const) {
    for (const view of ["Inclusive", "Exclusive"] as const) {
      it(`bill discount 1.000 (amount, discount calc ${discCalc}, view ${view}) survives settled → edit`, () => {
        localStorage.setItem("discCalc", discCalc);
        localStorage.setItem("priceView", view);
        const items = [
          { uniqueId: "a", productId: 21, quantity: 2, price: 3.5, isIncl: true, product: P1 },
          { uniqueId: "b", productId: 22, quantity: 1, price: 1.2, isIncl: false, product: P2 },
        ];
        const calc = calculateOrder(items, { orderType: "TakeOut", orderTypeId: 2, productCache, billDiscountValue: 1, billDiscountType: "amount" });
        const p: any = buildDirectSettleOrderPayload({
          cartDetails: calc.lines, tax: calc.summary.vatAmount, total: calc.summary.grandTotal, deliveryCharge: 0,
          selectedOrderTypeName: "TakeOut", selectedOrderTypeId: 2, billDiscountValue: 1, billDiscountType: "amount",
        } as any, { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-05" } as any);

        const stored = {
          masterData: { orderNo: 1, orderType: "TakeOut", orderTypeId: 2, discAmount: p.discAmount, discPer: p.discPer, serviceCharge: 0, levy: 0, vatExclAmount: p.vatExclAmount, vatAmount: p.vatAmount, netAmount: p.netAmount, deliveryCharge: 0 },
          detailsData: p.details.map((d: any, i: number) => ({ qty: d.qty, productId: d.productId, productName: i ? "Fries" : "Burger", price: d.price, amount: d.price * d.qty, discAmount: d.discAmount, serviceCharge: 0, levy: 0, vatAmount: d.vatAmount, vatValue: 10, mapId: d.mapId })),
          modifiersData: null,
        };
        const data = applyStoredOrderView({ data: JSON.parse(JSON.stringify(stored)) }, view).data;
        const actions: any[] = [];
        loadSettledOrderIntoCart({ orderId: 1, orderData: data, dispatch: ((a: any) => { actions.push(a); return a; }) as any, products, productCache, showToast: () => {} });
        let state = posReducer(undefined, { type: "@@init" } as any);
        for (const a of actions) if (a?.type) state = posReducer(state, a);
        state = { ...state, productCache } as any;

        // The backend does not reliably return master discPer (real order #285), so restoreBillDiscount reads
        // equal per-line ratios as a percentage — an amount bill discount comes back as the equivalent %.
        // What matters (and was broken): the discount is NOT lost.
        expect(["amount", "percentage"]).toContain(state.billDiscountType);
        expect(state.billDiscountValue).toBeGreaterThan(0);
        const total = selectCartCalculation({ pos: { ...state, isCartModified: true } } as any).summary.grandTotal;
        // Same bill to the fil (the restored % is kept to 4 decimals → < 0.01 fil difference).
        // Before the fix this was the undiscounted total.
        expect(Math.round(total * 1000)).toBe(Math.round(p.netAmount * 1000));
      });
    }
  }
});
