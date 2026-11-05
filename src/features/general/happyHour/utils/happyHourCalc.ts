import { dec, round, toNum } from "../../../../utils/money";

/**
 * Happy hour: price ↔ discount % ↔ discount amount ↔ promo price.
 * The promo price is what the POS charges during the happy hour (promoPrice on the menu API), so:
 * - discount is clamped to 0 … price (never a negative promo price, never > 100 %),
 * - discount is rounded HALF-UP to the currency decimals and promo = price − discount EXACTLY
 *   (promo + discount always add back to the price; `toFixed` on both could be 1 fil off),
 * - the percentage is informational, kept to 2 decimals.
 */
export interface HappyHourAmounts {
  /** discount percent, 2 decimals */
  percent: number;
  /** discount amount, currency decimals */
  discount: number;
  /** price − discount, currency decimals */
  promo: number;
}

const clampDiscount = (price: number, discount: number) => Math.min(Math.max(0, discount), Math.max(0, price));

const build = (price: number, rawDiscount: number, decimals: number): HappyHourAmounts => {
  const p = round(Math.max(0, price || 0), decimals);
  const discount = round(clampDiscount(p, Number.isFinite(rawDiscount) ? rawDiscount : 0), decimals);
  const promo = toNum(dec(p).minus(discount));
  const percent = p > 0 ? round(dec(discount).dividedBy(p).times(100), 2) : 0;
  return { percent, discount, promo };
};

/** From a typed percentage (clamped to 0–100). */
export const happyHourFromPercent = (price: number, percent: number, decimals: number): HappyHourAmounts => {
  const pct = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  const amounts = build(price, toNum(dec(price || 0).times(pct).dividedBy(100)), decimals);
  return { ...amounts, percent: round(pct, 2) };
};

/** From a typed discount amount (clamped to 0–price). */
export const happyHourFromDiscount = (price: number, discount: number, decimals: number): HappyHourAmounts =>
  build(price, discount, decimals);

/** From a typed promo price (clamped to 0–price). */
export const happyHourFromPromo = (price: number, promo: number, decimals: number): HappyHourAmounts =>
  build(price, (price || 0) - (Number.isFinite(promo) ? promo : 0), decimals);

/** Why an entry cannot be added, or null when it is valid. */
export const validateHappyHourEntry = (price: number, promo: number): string | null => {
  if (!Number.isFinite(price) || price <= 0) return "Price must be greater than 0";
  if (!Number.isFinite(promo)) return "Enter a promo price, discount % or discount amount";
  if (promo < 0) return "Promo price cannot be negative";
  if (promo > price) return "Promo price cannot be higher than the price";
  return null;
};
