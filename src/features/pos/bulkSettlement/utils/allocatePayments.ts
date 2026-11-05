import { dec, round, sumDec, toNum } from "../../../../utils/money";

/**
 * Bulk (driver) settlement — split the payments taken for several delivery orders across the orders.
 *
 * Money rules (same as the rest of the POS, utils/money.ts):
 * - Amounts are compared and paid at the currency decimals (fils), rounded HALF-UP in exact decimal.
 *   `Number.toFixed` is NOT half-up on binary floats (1.0005.toFixed(3) can give "1.000").
 * - The amount due is the sum of each order's ROUNDED total, so the payments always cover exactly
 *   what the orders are allocated (summing raw 14-dp totals and rounding once could differ by a fil
 *   and create a "phantom" fil on the last paymode).
 * - Cash change is taken off the cash payments first.
 */

export interface BulkOrderInput {
  orderId: number;
  totalAmount: number;
}

export interface BulkPaymentInput {
  paymodeId: number | string;
  label?: string;
  amount: number;
}

export interface BulkOrderAllocation {
  orderId: number;
  paymodes: { paymodeId: number; amount: number }[];
  primaryPaymodeName: string;
}

const isCashLabel = (label?: string) => (label || "").toLowerCase().includes("cash");

/** Order total as it is paid (fils, half-up). */
export const orderPayable = (totalAmount: number, decimals: number): number => round(totalAmount || 0, decimals);

/** Amount due for the selected orders = Σ rounded order totals (exact). */
export const bulkAmountDue = (orders: BulkOrderInput[], decimals: number): number =>
  toNum(sumDec(orders.map((o) => orderPayable(o.totalAmount, decimals))));

export const allocateBulkPayments = (
  orders: BulkOrderInput[],
  payments: BulkPaymentInput[],
  change: number,
  decimals: number,
): BulkOrderAllocation[] => {
  // 1. Net payments (change returned from cash first).
  let remainingChange = dec(round(change || 0, decimals));
  const pool = payments.map((p) => {
    let net = dec(round(p.amount || 0, decimals));
    if (isCashLabel(p.label) && remainingChange.greaterThan(0)) {
      const deduct = net.lessThan(remainingChange) ? net : remainingChange;
      net = net.minus(deduct);
      remainingChange = remainingChange.minus(deduct);
    }
    return { paymodeId: Number(p.paymodeId), label: p.label || "", remaining: net };
  });

  // 2. Allocate the pool across the orders in order.
  return orders.map((order) => {
    let needed = dec(orderPayable(order.totalAmount, decimals));
    const paymodes: { paymodeId: number; amount: number }[] = [];
    const usedModes: string[] = [];

    for (const p of pool) {
      if (!needed.greaterThan(0)) break;
      if (!p.remaining.greaterThan(0)) continue;
      const alloc = needed.lessThan(p.remaining) ? needed : p.remaining;
      paymodes.push({ paymodeId: p.paymodeId, amount: toNum(alloc) });
      if (p.label && !usedModes.includes(p.label)) usedModes.push(p.label);
      needed = needed.minus(alloc);
      p.remaining = p.remaining.minus(alloc);
    }

    // Underpaid pool (should not happen: the payment screen requires paid ≥ due) — book the rest on the
    // last paymode so the order still records its full amount.
    if (needed.greaterThan(0)) {
      if (paymodes.length > 0) {
        const last = paymodes[paymodes.length - 1];
        last.amount = toNum(dec(last.amount).plus(needed));
      } else {
        paymodes.push({ paymodeId: pool[0]?.paymodeId || 1, amount: toNum(needed) });
      }
    }

    return { orderId: order.orderId, paymodes, primaryPaymodeName: usedModes.join(" / ") || "CASH" };
  });
};
