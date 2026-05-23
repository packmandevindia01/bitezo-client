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
  },

  /**
   * Fetches orders available for voiding.
   * GET /api/order/void
   */
  getVoidOrders: async (params?: RecallParams): Promise<RecallResponse> => {
    return unwrap<RecallResponse>(
      axiosInstance.get("/order/void", { params })
    );
  },

  /**
   * Voids an order.
   * PUT /api/order/void/{orderId}
   */
  voidOrder: async (orderId: number, payload: import("../types").VoidOrderRequest): Promise<{ isSuccess: boolean; message: string }> => {
    return unwrap<{ isSuccess: boolean; message: string }>(
      axiosInstance.put(`/order/void/${orderId}`, payload)
    );
  }
};

