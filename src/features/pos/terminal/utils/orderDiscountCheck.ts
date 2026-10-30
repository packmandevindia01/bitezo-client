/**
 * Utility functions for extracting and checking discounts on POS orders.
 */

export interface MasterAndDetails {
  master: any;
  details: any[];
}

export const extractMasterAndDetails = (orderRes: any): MasterAndDetails => {
  if (!orderRes) return { master: {}, details: [] };
  const rawData = (orderRes?.data && (orderRes.data.masterData || orderRes.data.detailsData || orderRes.data.master || orderRes.data.details))
    ? orderRes.data
    : (orderRes?.data !== undefined && orderRes?.isSuccess !== undefined ? orderRes.data : orderRes);
  const rawMaster = rawData?.masterData || rawData?.master || rawData;
  const master = Array.isArray(rawMaster) ? rawMaster[0] : (rawMaster || {});

  const rawDetails = rawData?.detailsData || rawData?.details || [];
  const details = Array.isArray(rawDetails) ? rawDetails : [];

  return { master, details };
};

/**
 * Checks if an order contains an active bill-level discount.
 * Handles percentage discounts, amount discounts, complimentary orders,
 * and mixed orders with both item-level and bill-level discounts.
 */
export const checkOrderHasBillDiscount = (orderRes: any): boolean => {
  if (!orderRes) return false;
  if (Boolean(orderRes?.isBillDiscount || orderRes?.summary?.isBillDiscount)) return true;
  if (Number(orderRes?.billDiscountValue || orderRes?.billDiscount || 0) > 0) return true;

  const { master, details } = extractMasterAndDetails(orderRes);
  if (!master || typeof master !== 'object') return false;

  // 1. Explicit bill complimentary status
  if (Boolean(master.complimentaryStatus || master.ComplimentaryStatus)) return true;

  // 2. Explicit bill discount value/percentage or flag
  if (Boolean(master.isBillDiscount)) return true;
  if (Number(master.billDiscountValue || master.billDiscount || master.BillDiscount || 0) > 0) return true;

  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? master.billDiscountPer ?? 0);
  if (masterDiscPer > 0) return true;

  // 3. Explicit check for 100% complimentary status across all items
  if (details.length > 0 && details.every((d: any) =>
    Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
  )) {
    return true;
  }

  // 4. Check if all line items share the exact same discPer > 0 with an active masterDiscPer
  if (details.length > 1 && masterDiscPer > 0) {
    const firstDiscPer = Number(details[0]?.discPer ?? details[0]?.DiscPer ?? 0);
    if (firstDiscPer > 0 && details.every((d: any) => Number(d.discPer ?? d.DiscPer ?? 0) === firstDiscPer)) {
      return true;
    }
  }

  // 5. Discount amount comparison against sum of line item discounts
  const masterDiscAmount = Number(
    master.discAmount ??
    master.DiscAmount ??
    master.discAmt ??
    master.DiscAmt ??
    master.discount ??
    master.Discount ??
    master.discountAmount ??
    master.DiscountAmount ??
    master.billDiscount ??
    master.BillDiscount ??
    master.billDiscountValue ??
    0
  );

  const activeLines = details.filter((d: any) => Number(d.qty ?? d.quantity ?? 1) > 0);
  if (activeLines.length === 0) {
    return masterDiscAmount > 0;
  }

  const lineDiscountsSum = activeLines.reduce((sum: number, d: any) => {
    const itemDisc = Number(
      d.discAmount ??
      d.DiscAmount ??
      d.itemDiscount ??
      d.discountValue ??
      d.discount ??
      d.lineDiscount ??
      d.lineDiscountExcl ??
      d.lineDiscountIncl ??
      d.rawItem?.discAmount ??
      d.rawItem?.DiscAmount ??
      d.rawItem?.itemDiscount ??
      d.rawItem?.discountValue ??
      d.rawItem?.discount ??
      0
    );
    return sum + itemDisc;
  }, 0);

  // If there are no line item discounts, the master discount is entirely a bill discount
  if (lineDiscountsSum <= 0.001) {
    return masterDiscAmount > 0;
  }

  // If master has no discount but lines have discounts, it is purely item-level discounts
  if (masterDiscAmount <= 0.001 && masterDiscPer <= 0.001) {
    return false;
  }

  // If master discount exceeds line item discounts by more than rounding tolerance,
  // there is an additional bill-level discount applied on top of line items!
  if (masterDiscAmount > lineDiscountsSum + 0.05) {
    return true;
  }

  // Otherwise, if line item discounts are present and account for the discount,
  // this is an ITEM-LEVEL discount!
  return false;
};

/**
 * Checks if an order contains ANY discount (bill-level or item-level).
 */
export const checkOrderHasAnyDiscount = (orderRes: any): boolean => {
  if (!orderRes) return false;
  if (checkOrderHasBillDiscount(orderRes)) return true;

  const { master, details } = extractMasterAndDetails(orderRes);

  const masterDiscAmount = Number(master?.discAmount ?? master?.DiscAmount ?? master?.discount ?? master?.Discount ?? 0);
  if (masterDiscAmount > 0) return true;

  const hasLineDiscount = details.some((d: any) => {
    return Number(d?.discPer ?? d?.DiscPer ?? 0) > 0 ||
           Number(d?.discAmount ?? d?.DiscAmount ?? 0) > 0 ||
           Number(d?.discountValue ?? 0) > 0;
  });

  return hasLineDiscount;
};

/**
 * Checks if an order has complimentary status (bill-level or all items complimentary).
 */
export const checkOrderIsComplimentary = (orderRes: any): boolean => {
  if (!orderRes) return false;
  const { master, details } = extractMasterAndDetails(orderRes);
  if (!master || typeof master !== 'object') return false;

  if (Boolean(master.complimentaryStatus || master.ComplimentaryStatus)) return true;
  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? master.billDiscountPer ?? 0);
  if (masterDiscPer === 100) return true;

  if (details.length > 0 && details.some((d: any) =>
    Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
  )) {
    return true;
  }

  return false;
};

/**
 * Validates whether an order can be split or combined.
 * Business Rule: Only item discounts are allowed in combine and split.
 * Bill discounts and complimentary orders are strictly NOT allowed.
 */
export const checkOrderAllowsSplitOrCombine = (orderRes: any): { allowed: boolean; reason?: string } => {
  if (!orderRes) return { allowed: true };

  if (checkOrderIsComplimentary(orderRes)) {
    return {
      allowed: false,
      reason: "Split and Combine are not allowed for complimentary orders. Only item discounts are allowed."
    };
  }

  if (checkOrderHasBillDiscount(orderRes)) {
    return {
      allowed: false,
      reason: "Split and Combine are not allowed for orders with bill discount. Only item discounts are allowed."
    };
  }

  return { allowed: true };
};
