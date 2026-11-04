import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';
import { calculateOrder, roundCalc, getStoredDefaultDeliveryCharge, getBillingConfigForOrder } from '../utils/billing';
export { getStoredDefaultDeliveryCharge };

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectPosState = (state: RootState) => state.pos;

export const selectCartCalculation = createSelector(
  [selectPosState],
  (pos) => calculateOrder(pos.cartItems, {
    orderType: pos.selectedOrderTypeName,
    orderTypeId: pos.selectedOrderTypeId,
    billDiscountValue: pos.billDiscountValue,
    billDiscountType: pos.billDiscountType,
    customDeliveryCharge: pos.customDeliveryCharge,
    productCache: pos.productCache,
    config: getBillingConfigForOrder(pos.selectedOrderTypeName, pos.editingOrderRates),
  })
);

export const selectCartDetails = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      !pos.isCartModified &&
      pos.authoritativeNetAmount !== null &&
      pos.authoritativeNetAmount !== undefined
    ) {
      return calc.lines.map((line, idx) => {
        const rawItem = pos.cartItems[idx] || pos.cartItems.find((ci: any) => ci.uniqueId === line.uniqueId || (ci.productId !== undefined && Number(ci.productId) === Number(line.productId)));
        if (rawItem && (rawItem as any).authoritativeLineTotal !== undefined) {
          return {
            ...line,
            price: (rawItem as any).authoritativePrice ?? line.price,
            lineTotal: (rawItem as any).authoritativeLineTotal,
            originalLineTotal: (rawItem as any).authoritativeOriginalLineTotal ?? (rawItem as any).authoritativeLineTotal,
            itemDiscount: (rawItem as any).authoritativeDiscount ?? line.itemDiscount,
          };
        }
        return line;
      });
    }
    return calc.lines;
  }
);

export const selectBaseSubtotal = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.baseSubtotal
);

export const selectSubtotal = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      pos.authoritativeSubtotal !== null &&
      pos.authoritativeSubtotal !== undefined &&
      !pos.isCartModified
    ) {
      return roundCalc(pos.authoritativeSubtotal);
    }
    return calc.summary.subtotal;
  }
);

export const selectItemTotalDiscount = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.itemDiscountsTotal
);

export const selectBillDiscount = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.billDiscountTotal
);

export const selectDiscount = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      pos.authoritativeDiscount !== null &&
      pos.authoritativeDiscount !== undefined &&
      !pos.isCartModified
    ) {
      return roundCalc(pos.authoritativeDiscount);
    }
    return calc.summary.totalDiscount;
  }
);

export const selectTotalExtras = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.totalExtras
);

export const selectCharges = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      pos.authoritativeCharges !== null &&
      pos.authoritativeCharges !== undefined &&
      !pos.isCartModified
    ) {
      return roundCalc(pos.authoritativeCharges);
    }
    return calc.summary.charges;
  }
);

export const selectTotalServiceCharge = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.serviceCharge
);

export const selectTotalLevy = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.levy
);

export const selectNetValue = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      pos.authoritativeNetValue !== null &&
      pos.authoritativeNetValue !== undefined &&
      !pos.isCartModified
    ) {
      return roundCalc(pos.authoritativeNetValue);
    }
    return calc.summary.vatExclAmount;
  }
);

export const selectTax = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      pos.authoritativeTax !== null &&
      pos.authoritativeTax !== undefined &&
      !pos.isCartModified
    ) {
      return roundCalc(pos.authoritativeTax);
    }
    return calc.summary.vatAmount;
  }
);

export const selectDeliveryCharge = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.deliveryCharge
);

export const selectTotal = createSelector(
  [selectPosState, selectCartCalculation],
  (pos, calc) => {
    if (
      pos.authoritativeNetAmount !== null &&
      pos.authoritativeNetAmount !== undefined &&
      !pos.isCartModified
    ) {
      return roundCalc(pos.authoritativeNetAmount);
    }
    return calc.summary.grandTotal;
  }
);

export const selectItemCount = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.itemCount
);
