/**
 * Converts a POS cart item into a PricingLineInput.
 * This is the ONLY place that decides a cart line's inclusivity and VAT rate.
 */
import type { DiscountInput, PricingLineInput, PricingSettings } from "./types";

const INCL_KEYS = ["isIncl", "priceIsIncl", "isInclusiveTax", "PriceIsIncl", "IsIncl"] as const;

/** Returns true/false if any source states it explicitly, otherwise undefined. */
const readInclFlag = (source: any): boolean | undefined => {
  if (!source) return undefined;
  for (const key of INCL_KEYS) {
    if (source[key] === true) return true;
  }
  for (const key of INCL_KEYS) {
    if (source[key] === false) return false;
  }
  return undefined;
};

/**
 * R1 — inclusivity of a cart line.
 *  1. The line's own flag (set from product master / promo / alternative / manual price edit).
 *  2. The product master tag (merged cache, then embedded product).
 *  3. Unknown → follow Price View (legacy fallback for items with no tag at all).
 */
export const readExplicitInclusivity = (item: any, product: any, cachedProduct: any): boolean | undefined => {
  const own = item?.isIncl === true || item?.isIncl === false ? item.isIncl : readInclFlag(item);
  if (own !== undefined) return own;
  return readInclFlag(cachedProduct) ?? readInclFlag(product);
};

export const resolvePriceIncludesTax = (
  item: any,
  product: any,
  cachedProduct: any,
  priceViewInclusive: boolean
): boolean => readExplicitInclusivity(item, product, cachedProduct) ?? priceViewInclusive;

const firstDefinedNumber = (...values: unknown[]): number | undefined => {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
};

/** VAT rate (percent): the rate a saved line was stored with, else the product's, else the default. */
export const resolveVatRate = (item: any, product: any, settings: PricingSettings): number =>
  firstDefinedNumber(item?.savedVatRate, product?.vatValue, item?.product?.vatValue, item?.vatValue, item?.vatRate) ??
  settings.defaultVatRate;

export const resolveItemDiscount = (item: any): DiscountInput | null => {
  const value = Number(item?.discountValue);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { type: item.discountType === "percentage" ? "percentage" : "amount", value };
};

export const resolveExtras = (item: any): { price: number; qty: number }[] =>
  (item?.extras || []).map((ex: any) => ({
    price: parseFloat(String(ex?.price)) || 0,
    qty: parseFloat(String(ex?.qty)) || 1,
  }));

export interface CartLineContext {
  product: any;
  cachedProduct: any;
  settings: PricingSettings;
}

export const cartItemToPricingLine = (item: any, ctx: CartLineContext): PricingLineInput => ({
  qty: Number(item?.quantity ?? 1),
  unitPrice: Number(item?.price ?? ctx.product?.price ?? 0),
  priceIncludesTax: resolvePriceIncludesTax(
    item,
    ctx.product,
    ctx.cachedProduct,
    ctx.settings.priceView === "Inclusive"
  ),
  vatRate: resolveVatRate(item, ctx.product, ctx.settings),
  extras: resolveExtras(item),
  discount: resolveItemDiscount(item),
});
