import { dec, round, sumDec, toNum } from "../../../utils/money";

/**
 * Money helpers for back-office vouchers (receipt / payment against invoices, multi-pay).
 * Same rules as the POS (utils/money.ts): exact decimal, HALF-UP at the currency decimals.
 * `Number.toFixed` is not half-up on binary floats and summing raw values then rounding once can
 * make the voucher header differ from the sum of its lines by a fil.
 */

/** One amount at the currency decimals, half-up. */
export const voucherAmount = (value: unknown, decimals: number): number => round(Number(value) || 0, decimals);

/** Header amount = exact sum of the lines, each rounded first (header always equals Σ lines). */
export const voucherTotal = (values: unknown[], decimals: number): number =>
  toNum(sumDec((values || []).map((v) => voucherAmount(v, decimals))));

/** Outstanding balance of an invoice — never negative (a fully paid invoice has balance 0). */
export const invoiceBalance = (invoiceAmount: unknown, receivedAmount: unknown, decimals: number): number => {
  const bal = dec(voucherAmount(invoiceAmount, decimals)).minus(voucherAmount(receivedAmount, decimals));
  return bal.isNegative() ? 0 : toNum(bal);
};

/** Paid vs due at the currency decimals: remaining (≥ 0), change (≥ 0), complete when paid ≥ due > 0. */
export const comparePaid = (paid: unknown[], due: unknown, decimals: number) => {
  const roundedPaid = voucherTotal(paid, decimals);
  const roundedDue = voucherAmount(due, decimals);
  const diff = toNum(dec(roundedDue).minus(roundedPaid));
  return {
    roundedPaid,
    roundedDue,
    remaining: diff > 0 ? diff : 0,
    change: diff < 0 ? -diff : 0,
    isComplete: roundedDue > 0 && roundedPaid >= roundedDue,
  };
};

/**
 * Id of the "Multi" paymode, found by NAME in the master paymode list. The back office used a
 * hardcoded 3 everywhere; if Multi has another id in a database, multi-pay lines were dropped on save.
 * Falls back to 3 (the seeded id) only when the list has no Multi entry.
 */
export const MULTI_PAYMODE_FALLBACK_ID = 3;
export const multiPaymodeId = (paymodes: { paymodeId: number | string; paymodeName?: string }[] | undefined | null): number => {
  const multi = (paymodes || []).find((p) => String(p.paymodeName || "").toLowerCase().includes("multi"));
  return multi ? Number(multi.paymodeId) : MULTI_PAYMODE_FALLBACK_ID;
};
