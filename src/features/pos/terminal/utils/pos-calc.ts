export type PriceView = 'inclusive' | 'exclusive';
export type DiscountCalc = 'inclusive' | 'exclusive';
export type DiscountType = 'item' | 'bill';

export interface Rates { levyPct: number; servicePct: number; vatPct: number }

export interface PosInput {
  lineBases: number[];            // exclusive base amount per line (as saved by backend)
  rates: Rates;
  priceView: PriceView;
  discountCalc: DiscountCalc;
  discountType: DiscountType;
  discount: { kind: 'fixed' | 'percent'; value: number }; // value as typed by cashier
  itemIndex?: number;             // which line, when discountType = 'item'
}

export interface PosResult {
  savedLineDiscounts: number[];   // exclusive, what the backend stores per line
  savedDiscount: number;          // sum of the above
  baseAfterDiscount: number;
  levy: number;
  service: number;
  netValue: number;
  vat: number;
  grandTotal: number;
  display: {
    lines: { price: number; discount: number | null; total: number }[];
    subTotal: number;
    discount: number;
  };
}

export const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

export const factorOf = (r: Rates) =>
  (1 + r.levyPct / 100) * (1 + r.servicePct / 100) * (1 + r.vatPct / 100);

// split an amount across weights in thousandths, remainder goes on the last line
export function allocate(total: number, weights: number[]): number[] {
  const t = Math.round(total * 1000);
  const w = weights.reduce((a, b) => a + b, 0);
  if (w === 0) return weights.map(() => 0);
  const parts = weights.map(x => Math.floor((t * x) / w));
  parts[parts.length - 1] += t - parts.reduce((a, b) => a + b, 0);
  return parts.map(p => p / 1000);
}

export function calculatePos(input: PosInput): PosResult {
  const { lineBases, rates, priceView, discountCalc, discountType, discount } = input;
  const factor = factorOf(rates);
  const viewFactor = priceView === 'inclusive' ? factor : 1;

  // weights: which lines the discount applies to
  const weights = lineBases.map((b, i) =>
    discountType === 'bill' ? b : i === (input.itemIndex ?? 0) ? b : 0
  );
  const eligibleBase = weights.reduce((a, b) => a + b, 0);

  // Step 1: typed discount -> exclusive amount (the only place discountCalc matters)
  let exclusiveTotal: number;
  if (discount.kind === 'percent') {
    exclusiveTotal = (eligibleBase * discount.value) / 100; // same in both modes
  } else {
    exclusiveTotal = discountCalc === 'inclusive' ? discount.value / factor : discount.value;
  }
  exclusiveTotal = round3(Math.min(exclusiveTotal, eligibleBase));

  const savedLineDiscounts = allocate(exclusiveTotal, weights);
  const savedDiscount = round3(savedLineDiscounts.reduce((a, b) => a + b, 0));

  // Step 2: charges on the discounted base (cascade levy -> service -> vat)
  const baseAfterDiscount = round3(lineBases.reduce((a, b) => a + b, 0) - savedDiscount);
  const levyRaw = (baseAfterDiscount * rates.levyPct) / 100;
  const serviceRaw = ((baseAfterDiscount + levyRaw) * rates.servicePct) / 100;
  const netRaw = baseAfterDiscount + levyRaw + serviceRaw;
  const vatRaw = (netRaw * rates.vatPct) / 100;

  // Step 3: display = saved exclusive values x view factor
  const lines = lineBases.map((b, i) => {
    const d = savedLineDiscounts[i];
    return {
      price: round3(b * viewFactor),
      discount: discountType === 'item' && d > 0 ? round3(d * viewFactor) : null,
      total: round3((discountType === 'item' ? b - d : b) * viewFactor),
    };
  });

  return {
    savedLineDiscounts,
    savedDiscount,
    baseAfterDiscount,
    levy: round3(levyRaw),
    service: round3(serviceRaw),
    netValue: round3(netRaw),
    vat: round3(vatRaw),
    grandTotal: round3(netRaw + vatRaw),
    display: {
      lines,
      subTotal: round3(lineBases.reduce((a, b) => a + b, 0)),
      discount: round3(savedDiscount),
    },
  };
}
