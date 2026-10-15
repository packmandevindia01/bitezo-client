/**
 * Utility functions for extracting and checking discounts on POS orders.
 */

export interface MasterAndDetails {
  master: any;
  details: any[];
}

export const extractMasterAndDetails = (orderRes: any): MasterAndDetails => {
  if (!orderRes) return { master: {}, details: [] };
  const rawData = orderRes?.data !== undefined && orderRes?.isSuccess !== undefined ? orderRes.data : orderRes;
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
  const { master, details } = extractMasterAndDetails(orderRes);
  if (!master || typeof master !== 'object') return false;

  // 1. Explicit bill complimentary status
  if (Boolean(master.complimentaryStatus || master.ComplimentaryStatus)) return true;

  // 2. Explicit bill discount value/percentage
  if (Number(master.billDiscountValue || master.billDiscount || master.BillDiscount || 0) > 0) return true;

  const masterDiscPer = Number(master.discPer ?? master.DiscPer ?? master.billDiscountPer ?? 0);
  if (masterDiscPer > 0) return true;

  // 3. Explicit check for 100% complimentary status across all items
  if (details.length > 0 && details.every((d: any) =>
    Boolean(d.complimentaryStatus || d.ComplimentaryStatus || Number(d.discPer ?? d.DiscPer ?? 0) === 100)
  )) {
    return true;
  }

  // 4. Discount amount comparison against sum of line item discounts
  const masterDiscAmount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? master.Discount ?? 0);
  if (masterDiscAmount > 0) {
    const lineDiscountsSum = details.reduce((sum: number, d: any) => {
      const itemDisc = Number(d.discAmount ?? d.DiscAmount ?? 0);
      return sum + itemDisc;
    }, 0);

    // If there are no line item discounts, the master discount is entirely a bill discount
    if (lineDiscountsSum <= 0.001) return true;

    // If master discount exceeds line item discounts, there is an order-level bill discount
    if (masterDiscAmount > lineDiscountsSum + 0.001) return true;
  }

  // 5. Check if all line items share the exact same discPer > 0
  // (orderPayloadMapper copies billDiscountValue into detail.discPer for all lines)
  if (details.length > 0) {
    const firstDiscPer = Number(details[0]?.discPer ?? details[0]?.DiscPer ?? 0);
    if (firstDiscPer > 0 && details.every((d: any) => Number(d.discPer ?? d.DiscPer ?? 0) === firstDiscPer)) {
      return true;
    }
  }

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
