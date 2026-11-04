/**
 * POS pricing engine — PURE functions only.
 *
 * No localStorage, no Redux, no React, no guessing. Every input is explicit.
 * The rules implemented here are documented in ./types.ts (R1–R9).
 *
 * All arithmetic is exact decimal (./money.ts). Results are rounded HALF-UP to 14 decimals
 * (CALC_PRECISION) — never truncated.
 */
import type {
  BillInput,
  DiscountInput,
  PricedBill,
  PricedExtra,
  PricedLine,
  PricingLineInput,
  PricingSettings,
  TaxMode,
} from "./types";
import { CALC_PRECISION, Money, dec, round, sumDec, toNum } from "./money";
import type { MoneyValue } from "./money";

export { CALC_PRECISION, round };

const ZERO = new Money(0);
const ONE = new Money(1);
const HUNDRED = new Money(100);

const nonNeg = (d: MoneyValue): MoneyValue => (d.isNegative() ? ZERO : d);
const minDec = (a: MoneyValue, b: MoneyValue): MoneyValue => (a.lessThan(b) ? a : b);

export interface LineRates {
  vat: number;
  serviceCharge: number;
  levy: number;
  factor: number;
}

interface LineRatesDec {
  vat: MoneyValue;
  serviceCharge: MoneyValue;
  levy: MoneyValue;
  factor: MoneyValue;
}

const lineRatesDec = (vatRatePercent: number, settings: PricingSettings): LineRatesDec => {
  const vat = settings.vatEnabled ? nonNeg(dec(vatRatePercent)).dividedBy(HUNDRED) : ZERO;
  const serviceCharge = nonNeg(dec(settings.serviceChargeRate)).dividedBy(HUNDRED);
  const levy = nonNeg(dec(settings.levyRate)).dividedBy(HUNDRED);
  const factor = ONE.plus(vat).times(ONE.plus(levy)).times(ONE.plus(serviceCharge));
  return { vat, serviceCharge, levy, factor };
};

/** R3 — rates (as fractions) and combined factor for one line. */
export const lineRates = (vatRatePercent: number, settings: PricingSettings): LineRates => {
  const r = lineRatesDec(vatRatePercent, settings);
  return { vat: toNum(r.vat), serviceCharge: toNum(r.serviceCharge), levy: toNum(r.levy), factor: toNum(r.factor) };
};

/** R4 — convert a typed discount into exclusive (base) and inclusive (gross) amounts for one line. */
const resolveLineDiscount = (
  discount: DiscountInput | null | undefined,
  amount: MoneyValue,
  factor: MoneyValue,
  discountCalc: TaxMode
): { base: MoneyValue; gross: MoneyValue } => {
  if (!discount || !amount.greaterThan(0)) return { base: ZERO, gross: ZERO };
  const value = nonNeg(dec(discount.value));
  if (!value.greaterThan(0)) return { base: ZERO, gross: ZERO };

  const grossAmount = amount.times(factor);
  let base: MoneyValue;
  let gross: MoneyValue;
  if (discount.type === "percentage") {
    const pct = minDec(HUNDRED, value).dividedBy(HUNDRED);
    base = amount.times(pct);
    gross = grossAmount.times(pct);
  } else if (discountCalc === "Inclusive") {
    gross = minDec(grossAmount, value);
    base = gross.dividedBy(factor);
  } else {
    base = minDec(amount, value);
    gross = base.times(factor);
  }
  return {
    base: minDec(amount, nonNeg(base)),
    gross: minDec(grossAmount, nonNeg(gross)),
  };
};

/**
 * Price a single line.
 * `discountCalcOverride` is used for allocated bill discounts, which are already exclusive.
 */
export const priceLine = (
  input: PricingLineInput,
  settings: PricingSettings,
  options: { discountCalcOverride?: TaxMode; isBillDiscount?: boolean } = {}
): PricedLine => {
  const qtyNum = Number.isFinite(Number(input.qty)) ? Number(input.qty) : 1;
  const qty = dec(qtyNum);
  const unitPrice = dec(input.unitPrice);
  const rates = lineRatesDec(input.vatRate, settings);
  const { factor } = rates;

  // R1 — exclusive unit price
  const baseUnitPrice = input.priceIncludesTax ? unitPrice.dividedBy(factor) : unitPrice;
  const productBase = qty.times(baseUnitPrice);

  // R2 — extras are always gross, converted with the line factor
  const extrasDec = (input.extras || []).map((ex) => {
    const grossPrice = dec(ex.price);
    const exQty = Number(ex.qty) || 1;
    const basePrice = grossPrice.dividedBy(factor);
    return { grossPrice, exQty, basePrice, baseAmount: basePrice.times(exQty) };
  });
  const extras: PricedExtra[] = extrasDec.map((e) => ({
    grossPrice: toNum(e.grossPrice),
    qty: e.exQty,
    basePrice: toNum(e.basePrice),
    baseAmount: toNum(e.baseAmount),
  }));
  const extrasGross = sumDec(extrasDec.map((e) => e.grossPrice.times(e.exQty)));
  const extrasBase = extrasGross.greaterThan(0) ? extrasGross.dividedBy(factor) : ZERO;

  const amount = productBase.plus(extrasBase);

  // R4 — discount
  const disc = resolveLineDiscount(input.discount, amount, factor, options.discountCalcOverride ?? settings.discountCalc);

  // R6 — charges on the discounted base
  const netValue = nonNeg(amount.minus(disc.base));
  const serviceCharge = netValue.greaterThan(0) ? netValue.times(rates.serviceCharge) : ZERO;
  const levy = netValue.greaterThan(0) ? netValue.plus(serviceCharge).times(rates.levy) : ZERO;
  const vatBase = nonNeg(netValue.plus(serviceCharge).plus(levy));
  const vatAmount = vatBase.greaterThan(0) ? vatBase.times(rates.vat) : ZERO;
  const lineNet = vatBase.plus(vatAmount);

  return {
    qty: qtyNum,
    unitPrice: toNum(unitPrice),
    priceIncludesTax: input.priceIncludesTax,
    vatRate: toNum(rates.vat.times(HUNDRED)),
    factor: toNum(factor),
    baseUnitPrice: toNum(baseUnitPrice),
    productBase: toNum(productBase),
    extras,
    extrasGross: toNum(extrasGross),
    extrasBase: toNum(extrasBase),
    amount: toNum(amount),
    grossAmount: toNum(amount.times(factor)),
    discountBase: toNum(disc.base),
    discountGross: toNum(disc.gross),
    isBillDiscount: Boolean(options.isBillDiscount),
    netValue: toNum(netValue),
    serviceCharge: toNum(serviceCharge),
    levy: toNum(levy),
    vatBase: toNum(vatBase),
    vatAmount: toNum(vatAmount),
    lineNet: toNum(lineNet),
  };
};

/**
 * R5 — split `total` across `weights` proportionally, at storage precision.
 * The rounding remainder goes to the largest weight so the parts sum EXACTLY to `total`.
 */
export const allocateProportionally = (total: number, weights: number[]): number[] => {
  const totalDec = dec(total);
  const weightDecs = weights.map((w) => dec(w));
  const totalWeight = sumDec(weightDecs);
  if (!totalDec.greaterThan(0) || !totalWeight.greaterThan(0)) return weights.map(() => 0);
  const parts = weightDecs.map((w) => totalDec.times(w).dividedBy(totalWeight).toDecimalPlaces(CALC_PRECISION));
  const remainder = totalDec.toDecimalPlaces(CALC_PRECISION).minus(sumDec(parts));
  if (!remainder.isZero()) {
    let largest = 0;
    weightDecs.forEach((w, i) => {
      if (w.greaterThan(weightDecs[largest])) largest = i;
    });
    parts[largest] = parts[largest].plus(remainder);
  }
  return parts.map((p) => toNum(p));
};

/** R5 — convert a typed bill discount into an exclusive amount. */
export const resolveBillDiscountExclusive = (
  discount: DiscountInput | null | undefined,
  totalBase: number,
  totalGross: number,
  discountCalc: TaxMode
): number => {
  const value = nonNeg(dec(discount?.value));
  const base = dec(totalBase);
  if (!discount || !value.greaterThan(0) || !base.greaterThan(0)) return 0;
  let exclusive: MoneyValue;
  if (discount.type === "percentage") {
    exclusive = base.times(value.dividedBy(HUNDRED));
  } else if (discountCalc === "Inclusive") {
    // Average factor of the bill; exact because allocation is proportional to base.
    const gross = dec(totalGross);
    exclusive = gross.greaterThan(0) ? value.times(base).dividedBy(gross) : value;
  } else {
    exclusive = value;
  }
  return toNum(minDec(base, nonNeg(exclusive)));
};

/** Price a whole bill. */
export const priceBill = (bill: BillInput, settings: PricingSettings): PricedBill => {
  const inputs = bill.lines || [];

  // Pass 1 — undiscounted lines give the weights and the bill factor.
  const undiscounted = inputs.map((l) => priceLine({ ...l, discount: null }, settings));
  const totalBase = toNum(sumDec(undiscounted.map((l) => l.amount)));
  const totalGross = toNum(sumDec(undiscounted.map((l) => l.lineNet)));

  const billDiscountExclusive = resolveBillDiscountExclusive(bill.billDiscount, totalBase, totalGross, settings.discountCalc);
  const billDiscountApplied = billDiscountExclusive > 0;

  // Pass 2 — final lines.
  let lines: PricedLine[];
  if (billDiscountApplied) {
    const allocated = allocateProportionally(billDiscountExclusive, undiscounted.map((l) => l.amount));
    lines = inputs.map((l, i) =>
      priceLine({ ...l, discount: { type: "amount", value: allocated[i] } }, settings, {
        discountCalcOverride: "Exclusive",
        isBillDiscount: true,
      })
    );
  } else {
    lines = inputs.map((l) => priceLine(l, settings));
  }

  const deliveryCharge = toNum(nonNeg(dec(bill.deliveryCharge)));
  const itemLines = lines.filter((l) => !l.isBillDiscount);
  const billLines = lines.filter((l) => l.isBillDiscount);
  const total = (arr: PricedLine[], pick: (l: PricedLine) => number) => toNum(sumDec(arr.map(pick)));

  const itemDiscountExclusive = total(itemLines, (l) => l.discountBase);
  const itemDiscountInclusive = total(itemLines, (l) => l.discountGross);
  const billDiscountExclusiveTotal = total(billLines, (l) => l.discountBase);
  const billDiscountInclusive = total(billLines, (l) => l.discountGross);
  const linesNet = total(lines, (l) => l.lineNet);

  return {
    lines,
    billDiscountApplied,
    totals: {
      subTotalExclusive: total(lines, (l) => l.amount),
      subTotalInclusive: total(lines, (l) => l.grossAmount),
      itemDiscountExclusive,
      itemDiscountInclusive,
      billDiscountExclusive: billDiscountExclusiveTotal,
      billDiscountInclusive,
      discountExclusive: toNum(sumDec([itemDiscountExclusive, billDiscountExclusiveTotal])),
      discountInclusive: toNum(sumDec([itemDiscountInclusive, billDiscountInclusive])),
      serviceCharge: total(lines, (l) => l.serviceCharge),
      levy: total(lines, (l) => l.levy),
      vatExclAmount: total(lines, (l) => l.vatBase),
      vatAmount: total(lines, (l) => l.vatAmount),
      linesNet,
      deliveryCharge,
      grandTotal: toNum(sumDec([linesNet, deliveryCharge])),
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      extrasGross: total(lines, (l) => l.extrasGross),
    },
  };
};
