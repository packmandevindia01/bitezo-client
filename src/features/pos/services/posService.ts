import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { PosCategory, PosProduct } from "../types";

/**
 * Service for POS related API calls.
 * Currently uses mock logic or placeholders for terminal-specific actions.
 */
export const posService = {
  /**
   * Fetches the list of categories for the POS terminal.
   */
  fetchCategories: async (): Promise<PosCategory[]> => {
    // Placeholder for API call: /pos/categories
    // For now, handled via constants or Redux initial state
    return [];
  },

  /**
   * Fetches the list of products for the POS terminal.
   */
  fetchProducts: async (): Promise<PosProduct[]> => {
    // Placeholder for API call: /pos/products
    return [];
  },

  /**
   * Synchronizes the current cart or order with the server.
   */
  syncOrder: async (orderData: any) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos/order/sync", orderData);
    return data;
  },

  /**
   * Processes a payment for a POS transaction.
   */
  processPayment: async (paymentData: any) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos/transaction/pay", paymentData);
    return data;
  }
};
