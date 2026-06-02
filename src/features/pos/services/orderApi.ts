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
  },

  /**
   * Fetches full order details by order ID for recall/edit.
   * GET /api/order/recall/order_data/{orderId}
   */
  getOrderDetails: async (orderId: number): Promise<any> => {
    const priceView = (() => {
      try {
        const saved = localStorage.getItem('posConfigs');
        const full = saved ? JSON.parse(saved) : {};
        return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
      } catch { return 'Exclusive'; }
    })();
    return unwrap<any>(
      axiosInstance.get(`/order/recall/order_data/${orderId}`, { params: { priceView } })
    );
  },

  /**
   * Fetches combinable orders.
   * GET /api/order/combine
   */
  getCombineOrders: async (params: { DayId: number; OrderTypeId: number; OrderId: number; Decimals: number }): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get("/order/combine", { params })
    );
  },

  /**
   * Fetches combined cart details for multiple orders.
   * GET /api/order/combine/combined-orders
   */
  getCombinedOrderDetails: async (orderIds: number[]): Promise<any> => {
    // Axios array serialization for query params (OrderIds=1&OrderIds=2)
    const params = new URLSearchParams();
    orderIds.forEach(id => params.append('OrderIds', id.toString()));
    return unwrap<any>(
      axiosInstance.get("/order/combine/combined-orders", { params })
    );
  },

  /**
   * Updates an existing order.
   * PUT /api/menu/order/{orderId}
   */
  updateOrder: async (orderId: number, order: import("../types").MenuOrderUpdateRequest): Promise<MenuOrderResponse> => {
    return unwrap<MenuOrderResponse>(
      axiosInstance.put(`/menu/order/${orderId}`, order)
    );
  }
};

