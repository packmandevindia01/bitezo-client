/**
 * Purchase invoice / purchase return line maths — ONE function for both screens.
 *
 *   amount        = qty × price                          (price is exclusive; FOC is free stock, not priced)
 *   lineDiscount  = amount / grossTotal × billDiscount   (bill discount shared in proportion to amount)
 *   vatAmount     = (amount − lineDiscount) × vat%
 *   netAmount     = amount − lineDiscount + vatAmount
 *
 * Exact decimal arithmetic, results at 14 decimals rounded half-up (utils/money.ts) — the same precision as
 * the POS. Totals must be summed with `sumPurchaseLines` (exact), so the header always equals Σ lines.
 * Display / print / amount-to-pay round to the currency decimals.
 */
import { dec, sumDec, toNum } from "../../../utils/money";

export interface PurchaseLineAmounts {
  amount: number;
  discountAmount: number;
  vatAmount: number;
  netAmount: number;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const calculatePurchaseLine = (
  qty: unknown,
  price: unknown,
  vatPercent: unknown,
  grossTotal: unknown = 0,
  billDiscount: unknown = 0
): PurchaseLineAmounts => {
  const amount = dec(num(qty)).times(dec(num(price)));
  const gross = dec(num(grossTotal));
  const discountAmount = gross.greaterThan(0) ? amount.times(dec(num(billDiscount))).dividedBy(gross) : dec(0);
  const taxable = amount.minus(discountAmount);
  const vatAmount = taxable.times(dec(num(vatPercent))).dividedBy(100);
  const netAmount = taxable.plus(vatAmount);
  return {
    amount: toNum(amount),
    discountAmount: toNum(discountAmount),
    vatAmount: toNum(vatAmount),
    netAmount: toNum(netAmount),
  };
};

/** Exact Σ of line amounts + other charge + round-off, at 14 decimals. */
export const sumPurchaseLines = (
  lines: PurchaseLineAmounts[],
  otherCharge: unknown = 0,
  roundOff: unknown = 0
) => {
  const discountAmount = sumDec(lines.map((l) => l.discountAmount));
  const vatAmount = sumDec(lines.map((l) => l.vatAmount));
  const netAmount = sumDec(lines.map((l) => l.netAmount));
  const grandTotal = netAmount.plus(dec(num(otherCharge))).plus(dec(num(roundOff)));
  return {
    discountAmount: toNum(discountAmount),
    vatAmount: toNum(vatAmount),
    netAmount: toNum(netAmount),
    /** Σ net − Σ VAT (exclusive value after discount) */
    vatExclAmount: toNum(netAmount.minus(vatAmount)),
    grandTotal: toNum(grandTotal),
  };
};
