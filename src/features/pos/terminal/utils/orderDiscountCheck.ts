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
  if (orderRes?.isBillDiscount === false) return false;
  if (orderRes?.summary?.isBillDiscount === false) return false;
  if (Boolean(orderRes?.isBillDiscount || orderRes?.summary?.isBillDiscount)) return true;
  if (Number(orderRes?.billDiscountValue || orderRes?.billDiscount || 0) > 0) return true;

  const { master, details } = extractMasterAndDetails(orderRes);
  if (!master || typeof master !== 'object') return false;

  if (master.isBillDiscount === false) return false;
  if (Boolean(master.isBillDiscount)) return true;
  if (Number(master.billDiscountValue || master.billDiscount || master.BillDiscount || 0) > 0) return true;

  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? master.billDiscountPer ?? 0);
  if (masterDiscPer > 0) return true;

  // 1. Explicit bill complimentary status
  if (Boolean(master.complimentaryStatus || master.ComplimentaryStatus)) return true;

  // 2. Explicit check for 100% complimentary status across all items
  if (details.length > 0 && details.every((d: any) =>
    Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
  )) {
    return true;
  }

  // 3. Check if all line items share the exact same discPer > 0 with an active masterDiscPer
  if (details.length > 1 && masterDiscPer > 0) {
    const firstDiscPer = Number(details[0]?.discPer ?? details[0]?.DiscPer ?? 0);
    if (firstDiscPer > 0 && details.every((d: any) => Number(d.discPer ?? d.DiscPer ?? 0) === firstDiscPer)) {
      return true;
    }
  }

  // 4. Discount amount check
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

  const hasLineDiscounts = details.some((d: any) => {
    const val = Number(
      d.baseDiscount ||
      d.itemDiscount ||
      d.itemDiscountAmount ||
      d.itemDiscountExcl ||
      d.discountValue ||
      d.discAmount ||
      d.DiscAmount ||
      d.lineDiscount ||
      d.discount ||
      0
    );
    return val > 0.001;
  });

  // When master data has discount value:
  // - If details data also has discount values: treated as bill level discount (bill discount allocated across items)
  // - If details data has no discount values: treated as bill level discount
  // When master data does NOT have discount value (masterDiscAmount <= 0.001):
  // - If details data has discount value: treated as item discount
  if (hasLineDiscounts && masterDiscAmount <= 0.001) {
    return false;
  }

  return masterDiscAmount > 0.001;
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
