import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../../../app/store';
import { calculateOrder, getStoredDefaultDeliveryCharge } from '../utils/billing';
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
  [selectCartCalculation],
  (calc) => calc.summary.subtotal
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
  [selectCartCalculation],
  (calc) => calc.summary.totalDiscount
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
  [selectCartCalculation],
  (calc) => calc.summary.vatAmount
);

export const selectDeliveryCharge = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.deliveryCharge
);

export const selectTotal = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.grandTotal
);

export const selectItemCount = createSelector(
  [selectCartCalculation],
  (calc) => calc.summary.itemCount
);
