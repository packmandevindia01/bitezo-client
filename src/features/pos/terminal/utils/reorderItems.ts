/**
 * RE-ORDER KOT (an edited order is sent again): print only what was ADDED.
 * - New lines print in full.
 * - Existing lines print the added quantity only (quantity − originalQty); lines that did not grow are skipped.
 * - Modifiers and extras are printed exactly as attached to the line (modifiers are added once, extras are
 *   per line — R2). They used to be multiplied by the share of new units (e.g. 1 of 3 → qty 0.333).
 * - lineTotal is scaled to the added quantity; prices on the KOT come from the engine line (`pricedLine`),
 *   which the print scales by quantity / pricedLine.qty (printPricing.applyCartPricingToUnified).
 */
export const buildReorderItems = <T extends { isExisting?: boolean; quantity: number; originalQty?: number; lineTotal?: number }>(
  cartDetails: T[]
): T[] =>
  cartDetails
    .filter((item) => !item.isExisting || item.quantity > (item.originalQty || 0))
    .map((item) => {
      const addedQty = item.isExisting ? item.quantity - (item.originalQty || 0) : item.quantity;
      const share = item.quantity > 0 ? addedQty / item.quantity : 0;
      return {
        ...item,
        quantity: addedQty,
        lineTotal: (item.lineTotal || 0) * share,
      };
    });
