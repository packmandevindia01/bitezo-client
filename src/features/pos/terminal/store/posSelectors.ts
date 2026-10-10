import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';
import { calculateOrder, roundCalc, getStoredDefaultDeliveryCharge } from '../utils/billing';
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
  })
);

export const selectCartDetails = createSelector(
  [selectCartCalculation],
  (calc) => calc.lines
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
  [selectCartCalculation],
  (calc) => calc.summary.charges
);

export const selectTotalServiceCharge = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.serviceCharge
);

export const selectTotalLevy = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.levy
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
