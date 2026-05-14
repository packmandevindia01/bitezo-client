import axiosInstance from "../../../api/axiosInstance";
import type { MenuOrderRequest, MenuOrderResponse, RecallParams, RecallResponse } from "../types";

/**
 * Standard unwrap helper to extract data and handle success/error based on the API response.
 */
const unwrap = <T>(promise: Promise<{ data: any }>) => 
  promise.then(res => res.data as T);

/**
 * Service for Order-related API calls in POS.
 */
export const orderApi = {
  /**
   * Submits a new order to the kitchen/system.
   * POST /api/menu/order
   */
  submitOrder: async (order: MenuOrderRequest): Promise<MenuOrderResponse> => {
    return unwrap<MenuOrderResponse>(
      axiosInstance.post("/menu/order", order)
    );
  },

  /**
   * Fetches orders for recall.
   * GET /api/order/recall
   */
  getRecallOrders: async (params?: RecallParams): Promise<RecallResponse> => {
    return unwrap<RecallResponse>(
      axiosInstance.get("/order/recall", { params })
    );
  }
};

