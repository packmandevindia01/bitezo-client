/**
 * Money arithmetic for the POS, the back office and the display formatters.
 *
 * - Calculations run in exact decimal arithmetic (decimal.js, 40 significant digits) — no binary-float
 *   drift such as 1.1 × 1.05 × 1.1 = 1.2705000000000004.
 * - Results are kept at CALC_PRECISION = 14 decimals, ROUNDED HALF-UP (half away from zero).
 *   Never truncated: cutting off always loses value in the same direction and turns
 *   12.705 (incl.) → base 9.99999999999999 → 9.999 on screen. Rounding at 14 decimals changes a value by at
 *   most 0.000000000000005 and gives 10.000.
 * - Only display / print / amount-to-pay round to the currency decimals (fils), also half-up.
 *
 * NOTE: results are returned as JS numbers (the app, the payloads and the backend `double` DTOs use numbers).
 * A JS number holds ~15–16 significant digits, so for amounts ≥ 100 the last of the 14 decimals is limited by
 * the number type — the exact decimal maths happens inside, before that conversion.
 */
import Decimal from "decimal.js";

export const CALC_PRECISION = 14;

/** Decimal configured for money: 40 significant digits, half-up rounding. */
export const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type MoneyValue = InstanceType<typeof Money>;

const toFinite = (val: unknown): number => {
  const n = typeof val === "string" ? parseFloat(val) : Number(val ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Exact decimal from a number / numeric string (non-finite → 0). Numbers use their shortest representation. */
export const dec = (val: unknown): MoneyValue => {
  if (val instanceof Money) return val as MoneyValue;
  if (typeof val === "string" && val.trim() !== "" && Number.isFinite(Number(val))) return new Money(val.trim());
  return new Money(toFinite(val));
};

/**
 * Below this many decimals (display / fils rounding), a value is first tidied to NOISE_DECIMALS so binary-float
 * noise cannot decide the rounding: 69.87749999999999 (= 69.8775 + float noise) → 69.8775 → 69.878, not 69.877.
 * Real amounts never carry meaning at the 12th decimal, so this only removes noise.
 */
const NOISE_DECIMALS = 12;

/** Round half-up (away from zero) to `decimals` places. Default: the 14-decimal storage precision. */
export const round = (val: unknown, decimals: number = CALC_PRECISION): number => {
  const places = Math.max(0, Math.floor(decimals));
  let d = val instanceof Money ? (val as MoneyValue) : dec(val);
  if (places < NOISE_DECIMALS) d = d.toDecimalPlaces(NOISE_DECIMALS, Decimal.ROUND_HALF_UP);
  return d.toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
};

/** Decimal → number at storage precision. */
export const toNum = (d: MoneyValue): number => round(d);

/** Σ of values in exact decimal. */
export const sumDec = (values: unknown[]): MoneyValue => values.reduce<MoneyValue>((acc, v) => acc.plus(dec(v)), new Money(0));

/** Σ of values, rounded to storage precision. */
export const sumMoney = (values: unknown[]): number => toNum(sumDec(values));

// ─── Display balancing (fils) ───────────────────────────────────────────────────────────────────
/**
 * Round `values` to `decimals` so that they add up EXACTLY to `total` rounded to `decimals`
 * (largest-remainder method). Used ONLY for what is shown / printed — stored and charged amounts stay exact.
 *
 * - Each value moves at most one unit (1 fil) away from its own half-up rounding.
 * - A value that is exactly 0 stays 0 (no fil is pushed into an empty Discount / Charges row).
 * - Safety: if the rounded values miss the target by more units than there are values to adjust, the inputs
 *   do not belong together (not a rounding issue) — they are returned plainly rounded, unbalanced.
 */
export const balanceToTotal = (values: unknown[], total: unknown, decimals: number): number[] => {
  const places = Math.max(0, Math.floor(decimals));
  const unit = new Money(10).pow(places);
  const exact = values.map((v) => dec(v).toDecimalPlaces(12, Decimal.ROUND_HALF_UP).times(unit)); // in fils
  const rounded = exact.map((e) => e.toDecimalPlaces(0, Decimal.ROUND_HALF_UP));
  const target = dec(total).toDecimalPlaces(12, Decimal.ROUND_HALF_UP).times(unit).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  let diff = target.minus(sumDec(rounded)).toNumber(); // whole fils to move

  const movable = exact.map((e, i) => ({ i, residual: e.minus(rounded[i]).toNumber() })).filter(({ i }) => !exact[i].isZero());
  if (diff !== 0 && Math.abs(diff) <= movable.length) {
    // short → round UP the values that were rounded down the most; over → round DOWN those rounded up the most
    const order = [...movable].sort((a, b) => (diff > 0 ? b.residual - a.residual : a.residual - b.residual));
    for (let k = 0; diff !== 0; k++) {
      const { i } = order[k % order.length];
      const step = diff > 0 ? 1 : -1;
      rounded[i] = rounded[i].plus(step);
      diff -= step;
    }
  }
  return rounded.map((r) => r.dividedBy(unit).toNumber());
};

export interface BillFooterValues {
  subTotal: unknown;
  discount: unknown;
  charges: unknown;
  vat: unknown;
  delivery: unknown;
  grandTotal: unknown;
}

/**
 * The bill footer as shown, in `decimals` (fils), always adding up:
 *     Sub Total − Discount + Charges = Net Value
 *     Net Value + VAT + Delivery     = Grand Total
 * Grand Total and Delivery are each their own exact value rounded (the amount to pay / a typed charge);
 * the other rows are balanced by `balanceToTotal`, so each is within 1 fil of its own rounding.
 * Display only — nothing stored or charged changes.
 */
export const balanceBillFooter = (v: BillFooterValues, decimals: number) => {
  const grandTotal = round(v.grandTotal, decimals);
  const delivery = round(v.delivery, decimals);
  const netExact = dec(v.subTotal).minus(dec(v.discount)).plus(dec(v.charges));
  const [netValue, vat] = balanceToTotal([netExact, v.vat], dec(grandTotal).minus(dec(delivery)), decimals);
  const [subTotal, negDiscount, charges] = balanceToTotal([v.subTotal, dec(v.discount).negated(), v.charges], netValue, decimals);
  return { subTotal, discount: negDiscount === 0 ? 0 : -negDiscount, charges, netValue, vat, delivery, grandTotal };
};
