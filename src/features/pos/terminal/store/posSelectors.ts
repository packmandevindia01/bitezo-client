import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';
import { calculateLineItem, getBillingConfig } from '../utils/billing';
import type { PosCartItem } from '../../types';

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectPosState = (state: RootState) => state.pos;

export const selectCartDetails = createSelector(
  [selectPosState],
  (pos) => {
    const config = getBillingConfig(pos.selectedOrderTypeName);

    // FIRST PASS: Calculate total gross amount to determine bill discount proportions
    let totalGross = 0;
    const itemsPreCalc = pos.cartItems.map((item: PosCartItem) => {
      const product = pos.productCache[item.productId] || item.product;
      if (!product) return null;
      
      const price = Number(item.price ?? product.price ?? 0);
      const totalExtrasForLine = (item.extras || []).reduce((sum, extra) => {
        const p = parseFloat(String(extra.price)) || 0;
        const q = parseFloat(String(extra.qty)) || 1;
        return sum + (p * q);
      }, 0);
      
      const itemGross = (price * Number(item.quantity)) + totalExtrasForLine;
      totalGross += itemGross;

      return {
        item,
        product,
        price,
        totalExtrasForLine,
        itemGross
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // SECOND PASS: Distribute discount and calculate line items
    return itemsPreCalc.map(({ item, product, price, totalExtrasForLine, itemGross }) => {
      const displayName = item.variantName ? `${product.name} - ${item.variantName}` : product.name;
      
      let discountObj: { type: 'percentage' | 'amount'; value: number } | number = 0;
      if (pos.billDiscountValue > 0 && totalGross > 0) {
        if (pos.billDiscountType === 'percentage') {
          discountObj = { type: 'percentage', value: pos.billDiscountValue };
        } else {
          // Proportional distribution of flat bill discount
          discountObj = { type: 'amount', value: (itemGross / totalGross) * pos.billDiscountValue };
        }
      } else if (item.discountValue) {
        // Use individual item discount if no bill discount exists
        discountObj = { type: item.discountType || 'amount', value: item.discountValue };
      }

      const calcs = calculateLineItem(item.quantity, price, discountObj, totalExtrasForLine, config, product.vatValue, item.isIncl);
      const noDiscountCalcs = calculateLineItem(item.quantity, price, 0, totalExtrasForLine, config, product.vatValue, item.isIncl);
      const itemDiscount = calcs.discountAmount ?? 0;

      return {
        ...item,
        product: {
          ...product,
          name: displayName,
          price: price
        },
        extrasTotal: totalExtrasForLine,
        itemDiscount,
        originalLineTotal: noDiscountCalcs.lineNetAmount,
        baseAmount: calcs.baseAmount,
        amount: calcs.amount,
        netValue: calcs.netValue,
        sc: calcs.sc,
        levy: calcs.levy,
        vatAmount: calcs.vatAmount,
        vatRate: (product.vatValue || config.vatRate * 100),
        lineTotal: calcs.lineNetAmount
      };
    });
  }
);

export const selectBaseSubtotal = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.baseAmount, 0)
);

export const selectSubtotal = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.amount, 0)
);

export const selectItemTotalDiscount = createSelector(
  [selectCartDetails, selectPosState],
  (details, pos) => pos.billDiscountValue > 0 ? 0 : details.reduce((sum, item) => sum + item.itemDiscount, 0)
);

export const selectBillDiscount = createSelector(
  [selectCartDetails, selectPosState],
  (details, pos) => pos.billDiscountValue > 0 ? details.reduce((sum, item) => sum + item.itemDiscount, 0) : 0
);

export const selectDiscount = createSelector(
  [selectSubtotal, selectItemTotalDiscount, selectBillDiscount],
  (subtotal, itemDisc, billDisc) => Math.min(subtotal, itemDisc + billDisc)
);

export const selectTotalExtras = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.extrasTotal, 0)
);

export const selectCharges = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.sc + item.levy, 0)
);

export const selectTotalServiceCharge = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.sc, 0)
);

export const selectTotalLevy = createSelector(
  [selectCartDetails],
  (details) => details.reduce((sum, item) => sum + item.levy, 0)
);

export const selectTax = createSelector(
  [selectCartDetails],
  (details) => {
    return details.reduce((sum, item) => sum + item.vatAmount, 0);
  }
);

export const getStoredDefaultDeliveryCharge = (): number => {
  try {
    for (const key of ['posConfigs', 'posConfig', 'pos_configs', 'pos_config']) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs ?? parsed;
        const val =
          configs?.defaultDeliveryCharge ??
          configs?.defaultdeliverycharge ??
          configs?.defaultDeliverycharge ??
          configs?.deliveryCharge ??
          configs?.deliverycharge ??
          configs?.DeliveryCharge ??
          configs?.DefaultDeliveryCharge ??
          parsed?.defaultDeliveryCharge ??
          parsed?.defaultdeliverycharge ??
          parsed?.defaultDeliverycharge ??
          parsed?.deliveryCharge ??
          parsed?.deliverycharge ??
          parsed?.DeliveryCharge ??
          parsed?.DefaultDeliveryCharge ??
          parsed?.charges?.defaultDeliveryCharge ??
          parsed?.charges?.deliveryCharge;
        if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
          return Number(val);
        }
      }
    }

    for (const key of ['defaultDeliveryCharge', 'deliveryCharge', 'defaultdeliverycharge', 'deliverycharge']) {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== "" && !isNaN(Number(raw))) {
        return Number(raw);
      }
    }
  } catch (e) {
    console.error("[posSelectors] Error reading default delivery charge:", e);
  }
  return 0;
};

export const selectDeliveryCharge = createSelector(
  [selectPosState],
  (pos) => {
    const isDelivery =
      pos.selectedOrderTypeId === 4 ||
      (pos.selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("delivery");
    if (!isDelivery) return 0;

    // If user manually picked a zone or recalled order has a delivery charge, use that override
    if (pos.customDeliveryCharge !== null && pos.customDeliveryCharge !== undefined) {
      return Number(pos.customDeliveryCharge) || 0;
    }

    return getStoredDefaultDeliveryCharge();
  }
);


export const selectTotal = createSelector(
  [selectSubtotal, selectDiscount, selectCharges, selectTax, selectDeliveryCharge],
  (subtotal, discount, charges, tax, deliveryCharge) => {
    return (subtotal - discount) + charges + tax + deliveryCharge;
  }
);

export const selectItemCount = createSelector(
  [(state: RootState) => state.pos.cartItems],
  (items) => items.reduce((sum: number, item: PosCartItem) => sum + item.quantity, 0)
);
