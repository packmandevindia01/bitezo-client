/**
 * Provider Settings price box: shown with the company's currency decimals (3 → "150.000"), and typing is limited to a
 * plain number with at most that many decimals.
 */

/** A price as the box shows it: fixed to `decimals`; empty for no price. */
export const formatPriceInput = (price: number | string | null | undefined, decimals: number): string => {
  const n = Number(price);
  if (price === null || price === undefined || price === "" || !Number.isFinite(n) || n === 0) return "";
  return n.toFixed(Math.max(0, decimals));
};

/**
 * What the user typed, if it is allowed: digits with at most one dot and at most `decimals` digits after it
 * ("", "1", "1.", ".5", "1.25" with 3 decimals). Anything else (letters, a minus, a second dot, too many decimals) → null,
 * so the box keeps its previous value.
 */
export const acceptPriceInput = (typed: string, decimals: number): string | null => {
  const value = typed.replace(",", ".").trim();
  if (value === "") return "";
  const d = Math.max(0, decimals);
  const pattern = d > 0 ? new RegExp(`^\\d*(\\.\\d{0,${d}})?$`) : /^\d*$/;
  return pattern.test(value) ? value : null;
};
