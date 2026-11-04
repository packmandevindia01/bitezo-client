/**
 * POS pricing engine — PURE functions only.
 *
 * No localStorage, no Redux, no React, no guessing. Every input is explicit.
 * The rules implemented here are documented in ./types.ts (R1–R9).
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

export const CALC_PRECISION = 7;

/** Round half away from zero at `decimals` places (default 7, the storage precision). */
export const round = (val: number | string | undefined | null, decimals: number = CALC_PRECISION): number => {
  const num = typeof val === "string" ? parseFloat(val) : Number(val || 0);
  if (!Number.isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  const sign = num < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(num) + 1e-11) * factor) / factor);
};

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

export interface LineRates {
  vat: number;
  serviceCharge: number;
  levy: number;
  factor: number;
}

/** R3 — rates (as fractions) and combined factor for one line. */
export const lineRates = (vatRatePercent: number, settings: PricingSettings): LineRates => {
  const vat = settings.vatEnabled ? Math.max(0, num(vatRatePercent)) / 100 : 0;
  const serviceCharge = Math.max(0, num(settings.serviceChargeRate)) / 100;
  const levy = Math.max(0, num(settings.levyRate)) / 100;
  return { vat, serviceCharge, levy, factor: (1 + vat) * (1 + levy) * (1 + serviceCharge) };
};

/** R4 — convert a typed discount into exclusive (base) and inclusive (gross) amounts for one line. */
const resolveLineDiscount = (
  discount: DiscountInput | null | undefined,
  amount: number,
  factor: number,
  discountCalc: TaxMode
): { base: number; gross: number } => {
  if (!discount || amount <= 0) return { base: 0, gross: 0 };
  const value = Math.max(0, num(discount.value));
  if (value <= 0) return { base: 0, gross: 0 };

  let base: number;
  let gross: number;
  if (discount.type === "percentage") {
    const pct = Math.min(100, value) / 100;
    base = amount * pct;
    gross = amount * factor * pct;
  } else if (discountCalc === "Inclusive") {
    gross = Math.min(amount * factor, value);
    base = gross / factor;
  } else {
    base = Math.min(amount, value);
    gross = base * factor;
  }
  return {
    base: Math.min(amount, Math.max(0, base)),
    gross: Math.min(amount * factor, Math.max(0, gross)),
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
  const qty = num(input.qty, 1);
  const unitPrice = num(input.unitPrice);
  const rates = lineRates(input.vatRate, settings);
  const { factor } = rates;

  // R1 — exclusive unit price
  const baseUnitPrice = input.priceIncludesTax ? unitPrice / factor : unitPrice;
  const productBase = qty * baseUnitPrice;

  // R2 — extras are always gross, converted with the line factor
  const extras: PricedExtra[] = (input.extras || []).map((ex) => {
    const grossPrice = num(ex.price);
    const exQty = num(ex.qty) || 1;
    const basePrice = grossPrice / factor;
    return {
      grossPrice,
      qty: exQty,
      basePrice: round(basePrice),
      baseAmount: round(basePrice * exQty),
    };
  });
  const extrasGross = sum(extras.map((e) => e.grossPrice * e.qty));
  const extrasBase = extrasGross > 0 ? extrasGross / factor : 0;

  const amount = productBase + extrasBase;

  // R4 — discount
  const disc = resolveLineDiscount(
    input.discount,
    amount,
    factor,
    options.discountCalcOverride ?? settings.discountCalc
  );

  // R6 — charges on discounted base
  const netValue = Math.max(0, amount - disc.base);
  const serviceCharge = netValue > 0 ? netValue * rates.serviceCharge : 0;
  const levy = netValue > 0 ? (netValue + serviceCharge) * rates.levy : 0;
  const vatBase = Math.max(0, netValue + serviceCharge + levy);
  const vatAmount = vatBase > 0 ? vatBase * rates.vat : 0;
  const lineNet = vatBase + vatAmount;

  return {
    qty,
    unitPrice,
    priceIncludesTax: input.priceIncludesTax,
    vatRate: rates.vat * 100,
    factor,
    baseUnitPrice: round(baseUnitPrice),
    productBase: round(productBase),
    extras,
    extrasGross: round(extrasGross),
    extrasBase: round(extrasBase),
    amount: round(amount),
    grossAmount: round(amount * factor),
    discountBase: round(disc.base),
    discountGross: round(disc.gross),
    isBillDiscount: Boolean(options.isBillDiscount),
    netValue: round(netValue),
    serviceCharge: round(serviceCharge),
    levy: round(levy),
    vatBase: round(vatBase),
    vatAmount: round(vatAmount),
    lineNet: round(lineNet),
  };
};

/**
 * R5 — split `total` across `weights` proportionally, at storage precision.
 * The rounding remainder goes to the largest weight so the parts sum exactly to `total`.
 */
export const allocateProportionally = (total: number, weights: number[]): number[] => {
  const totalWeight = sum(weights);
  if (total <= 0 || totalWeight <= 0) return weights.map(() => 0);
  const parts = weights.map((w) => round((total * w) / totalWeight));
  const remainder = round(total - sum(parts));
  if (remainder !== 0) {
    let largest = 0;
    weights.forEach((w, i) => {
      if (w > weights[largest]) largest = i;
    });
    parts[largest] = round(parts[largest] + remainder);
  }
  return parts;
};

/** R5 — convert a typed bill discount into an exclusive amount. */
export const resolveBillDiscountExclusive = (
  discount: DiscountInput | null | undefined,
  totalBase: number,
  totalGross: number,
  discountCalc: TaxMode
): number => {
  const value = Math.max(0, num(discount?.value));
  if (!discount || value <= 0 || totalBase <= 0) return 0;
  let exclusive: number;
  if (discount.type === "percentage") {
    exclusive = totalBase * (value / 100);
  } else if (discountCalc === "Inclusive") {
    // Average factor of the bill; exact because allocation is proportional to base.
    const orderFactor = totalGross > 0 ? totalGross / totalBase : 1;
    exclusive = value / orderFactor;
  } else {
    exclusive = value;
  }
  return round(Math.min(totalBase, Math.max(0, exclusive)));
};

/** Price a whole bill. */
export const priceBill = (bill: BillInput, settings: PricingSettings): PricedBill => {
  const inputs = bill.lines || [];

  // Pass 1 — undiscounted lines give the weights and the bill factor.
  const undiscounted = inputs.map((l) => priceLine({ ...l, discount: null }, settings));
  const totalBase = sum(undiscounted.map((l) => l.amount));
  const totalGross = sum(undiscounted.map((l) => l.lineNet));

  const billDiscountExclusive = resolveBillDiscountExclusive(
    bill.billDiscount,
    totalBase,
    totalGross,
    settings.discountCalc
  );
  const billDiscountApplied = billDiscountExclusive > 0;

  // Pass 2 — final lines.
  let lines: PricedLine[];
  if (billDiscountApplied) {
    const allocated = allocateProportionally(
      billDiscountExclusive,
      undiscounted.map((l) => l.amount)
    );
    lines = inputs.map((l, i) =>
      priceLine(
        { ...l, discount: { type: "amount", value: allocated[i] } },
        settings,
        { discountCalcOverride: "Exclusive", isBillDiscount: true }
      )
    );
  } else {
    lines = inputs.map((l) => priceLine(l, settings));
  }

  const deliveryCharge = round(Math.max(0, num(bill.deliveryCharge)));
  const itemLines = lines.filter((l) => !l.isBillDiscount);
  const billLines = lines.filter((l) => l.isBillDiscount);

  const itemDiscountExclusive = round(sum(itemLines.map((l) => l.discountBase)));
  const itemDiscountInclusive = round(sum(itemLines.map((l) => l.discountGross)));
  const billDiscountExclusiveTotal = round(sum(billLines.map((l) => l.discountBase)));
  const billDiscountInclusive = round(sum(billLines.map((l) => l.discountGross)));
  const linesNet = round(sum(lines.map((l) => l.lineNet)));

  return {
    lines,
    billDiscountApplied,
    totals: {
      subTotalExclusive: round(sum(lines.map((l) => l.amount))),
      subTotalInclusive: round(sum(lines.map((l) => l.grossAmount))),
      itemDiscountExclusive,
      itemDiscountInclusive,
      billDiscountExclusive: billDiscountExclusiveTotal,
      billDiscountInclusive,
      discountExclusive: round(itemDiscountExclusive + billDiscountExclusiveTotal),
      discountInclusive: round(itemDiscountInclusive + billDiscountInclusive),
      serviceCharge: round(sum(lines.map((l) => l.serviceCharge))),
      levy: round(sum(lines.map((l) => l.levy))),
      vatExclAmount: round(sum(lines.map((l) => l.vatBase))),
      vatAmount: round(sum(lines.map((l) => l.vatAmount))),
      linesNet,
      deliveryCharge,
      grandTotal: round(linesNet + deliveryCharge),
      itemCount: sum(lines.map((l) => l.qty)),
      extrasGross: round(sum(lines.map((l) => l.extrasGross))),
    },
  };
};
