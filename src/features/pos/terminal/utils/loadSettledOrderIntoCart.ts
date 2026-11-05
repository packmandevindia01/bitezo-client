import type { AppDispatch } from "../../../../app/store";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "./savedOrderToCart";

export interface LoadSettledOrderIntoCartParams {
  orderId: number;
  orderData: any;
  dispatch: AppDispatch;
  products?: any[];
  productCache?: Record<string | number, any>;
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
  onEditSuccess?: () => void;
}

/**
 * Loads a settled order into the POS cart for editing (`isSettledEdit: true`, the sale id is restored so
 * the update / re-settlement targets the existing transaction).
 * The loading itself is the shared saved-order loader (savedOrderToCart.ts, mode "settledEdit").
 */
export const loadSettledOrderIntoCart = ({
  orderId,
  orderData,
  dispatch,
  products = [],
  productCache = {},
  showToast,
  onEditSuccess,
}: LoadSettledOrderIntoCartParams): boolean => {
  if (!orderData) {
    showToast("No order data available to edit", "error");
    return false;
  }
  try {
    const load = buildSavedOrderLoad(orderData, { mode: "settledEdit", orderId, products, productCache });
    dispatchSavedOrderLoad(load, dispatch, orderId);
    showToast(`Settled Order #${orderId} loaded for editing`, "success");
    onEditSuccess?.();
    return true;
  } catch (err: any) {
    console.error("[loadSettledOrderIntoCart] Error:", err);
    showToast(err?.message || "Failed to load settled order into cart", "error");
    return false;
  }
};
