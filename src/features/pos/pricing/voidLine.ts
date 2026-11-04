/**
 * Voided units of a saved line (recall / settled edit → decrease or remove an existing item).
 *
 * The voided portion is priced with the SAME engine, the line's own price / inclusivity / VAT rate and
 * the order's settings (saved service charge / levy when editing), before discount — so:
 *   - the backend gets exclusive values (R9): product amount = productBase, extra amount = extra baseAmount
 *   - the void print can follow Print Price exactly like a normal KOT (it reads this PricedLine)
 */
import { priceLine, round } from "./engine";
import type { PricedLine, PricingSettings } from "./types";

export interface VoidExtraInput {
  /** gross (inclusive) extra price — cart extras are always gross (R2) */
  price: number;
  qty: number;
}

export const priceVoidedPortion = (
  line: Pick<PricedLine, "unitPrice" | "priceIncludesTax" | "vatRate">,
  voidQty: number,
  voidedExtras: VoidExtraInput[],
  settings: PricingSettings
): PricedLine =>
  priceLine(
    {
      qty: voidQty,
      unitPrice: line.unitPrice,
      priceIncludesTax: line.priceIncludesTax,
      vatRate: line.vatRate,
      extras: voidedExtras.map((e) => ({ price: Number(e.price) || 0, qty: Number(e.qty) || 1 })),
      discount: null,
    },
    settings
  );

const ADDITIVE: (keyof PricedLine)[] = [
  "qty", "productBase", "extrasGross", "extrasBase", "amount", "grossAmount", "discountBase", "discountGross",
  "netValue", "serviceCharge", "levy", "vatBase", "vatAmount", "lineNet",
];

/** Two voids of the same saved line merged into one void row (amounts add up). */
export const sumPricedLines = (a: PricedLine, b: PricedLine): PricedLine => {
  const out: any = { ...a, extras: [...(a.extras || []), ...(b.extras || [])] };
  for (const k of ADDITIVE) out[k] = round(Number(a[k] || 0) + Number(b[k] || 0));
  return out as PricedLine;
};
