import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/store/authSlice';
import masterDataReducer from '../features/inventory/shared/store/masterDataSlice';
import posReducer from '../features/pos/terminal/store/posSlice';
import shiftReducer from '../features/systemRegistration/store/shiftSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    masterData: masterDataReducer,
    pos: posReducer,
    shift: shiftReducer,
  },
  // RTK handles basic middleware automatically, you can add more if needed
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// DEV ONLY (stripped from production builds): cart debugging from the browser console.
//   __posCart()  → copies the current cart lines (price, isIncl, extras, discount, qty) to the clipboard
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as any).__posCart = () => {
    const pos = store.getState().pos as any;
    const dump = {
      orderType: pos.selectedOrderTypeName,
      editingOrderId: pos.editingOrderId,
      isCartModified: pos.isCartModified,
      editingOrderRates: pos.editingOrderRates,
      items: (pos.cartItems || []).map((i: any) => ({
        uniqueId: i.uniqueId, productId: i.productId, quantity: i.quantity, originalQty: i.originalQty,
        price: i.price, isIncl: i.isIncl, savedVatRate: i.savedVatRate, isExisting: i.isExisting, mapId: i.mapId,
        discountValue: i.discountValue, discountType: i.discountType,
        extras: i.extras, authoritativeLineTotal: i.authoritativeLineTotal,
      })),
    };
    const text = JSON.stringify(dump, null, 2);
    try { (window as any).copy?.(text); } catch { /* copy() only exists in DevTools */ }
    console.log(text);
    return dump;
  };
}
