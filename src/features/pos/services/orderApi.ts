import axiosInstance from "../../../api/axiosInstance";
import type { MenuOrderRequest, MenuOrderResponse, RecallParams, RecallResponse } from "../types";
import { getPriceView, sanitizeTaxExclusiveDetail, roundCalc, getVatStatus } from "../terminal/utils/billing";

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
  submitOrder: async (order: MenuOrderRequest, maxRetries = 3): Promise<MenuOrderResponse> => {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const payload = { ...order };
        if (payload.voucherDate) {
          payload.voucherDate = payload.voucherDate.includes("T")
            ? payload.voucherDate.split("T")[0]
            : payload.voucherDate;
        } else {
          payload.voucherDate = new Date().toISOString().split("T")[0];
        }

        payload.createdAt = new Date().toISOString();

        // Ensure details have tax-exclusive price and tax-inclusive netAmount
        if (payload.details && Array.isArray(payload.details)) {
          // Skip re-sanitization for details already marked as tax-exclusive (to prevent double-division by VAT)
          payload.details = payload.details.map((d: any) => d.isPriceTaxExclusive === true ? d : sanitizeTaxExclusiveDetail(d));
          const totalDetailGross = payload.details.reduce((sum: number, d: any) => sum + Number(d.price || 0) * Number(d.qty || 1), 0);
          const totalModifierGross = Array.isArray(payload.modifiers)
            ? payload.modifiers.reduce((sum: number, m: any) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0)
            : 0;
          const totalGrossExcl = roundCalc(totalDetailGross + totalModifierGross);
          const lineDiscounts = payload.details.reduce((sum: number, d: any) => sum + Number(d.discAmount || 0), 0);
          const isBillDisc = Boolean(
            (payload as any).isBillDiscount ||
            Number((payload as any).billDiscountValue || (payload as any).billDiscount || 0) > 0 ||
            (Number(payload.discAmount || 0) > 0 && lineDiscounts === 0)
          );

          if (isBillDisc) {
            payload.details.forEach((d: any) => {
              d.discAmount = 0;
              d.discPer = 0;
            });
            payload.discAmount = roundCalc(Number(payload.discAmount || 0));
            payload.vatExclAmount = roundCalc(Math.max(0, totalGrossExcl - payload.discAmount));
          } else {
            payload.discAmount = 0;
            payload.discPer = 0;
            payload.vatExclAmount = roundCalc(Math.max(0, totalGrossExcl - lineDiscounts));
          }

          const isVatEnabled = getVatStatus();
          const isComplimentary = Boolean((payload as any).complimentaryStatus || Number(payload.discPer) === 100);
          if (isVatEnabled && !isComplimentary && (!payload.vatAmount || Number(payload.vatAmount) <= 0)) {
            const payableBase = Math.max(0, Number(payload.netAmount || 0) - Number(payload.deliveryCharge || 0));
            if (payableBase > payload.vatExclAmount) {
              payload.vatAmount = roundCalc(payableBase - payload.vatExclAmount);
            }
          }
        }

        // Remove fields not in CreateKotOrderDto
        delete (payload as any).orderId;
        delete (payload as any).driverId;
        delete (payload as any).transDate;
        delete (payload as any).updatedAt;
        delete (payload as any).prevUpdatedAt;
        delete (payload as any).voidProducts;
        delete (payload as any).voidModifiers;
        delete (payload as any).combinedOrderIds;

        return await unwrap<MenuOrderResponse>(
          axiosInstance.post("/menu/order", payload)
        );
      } catch (e: any) {
        lastError = e;
        const status = e?.response?.status;
        const rawMsg = String(e?.response?.data?.message || e?.response?.data?.title || e?.message || "");
        const isTicketConflict = (status === 409 || rawMsg.toLowerCase().includes("ticket")) &&
          (rawMsg.toLowerCase().includes("ticket") || rawMsg.toLowerCase().includes("exists") || rawMsg.toLowerCase().includes("try again"));

        if (isTicketConflict && attempt < maxRetries) {
          const delay = (attempt + 1) * 250;
          console.warn(`[orderApi] Server returned: "${rawMsg}". Retrying order submission (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw e;
      }
    }

    throw lastError;
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
    console.log('[orderApi] voidOrder calling PUT /order/void/' + orderId, payload);
    return unwrap<{ isSuccess: boolean; message: string }>(
      axiosInstance.put(`/order/void/${orderId}`, payload)
    );
  },

  /**
   * Fetches full order details by order ID for recall/edit.
   * Primary: GET /api/v1/menu/order/order_data/{orderId}?priceView={priceView}
   * Fallback: GET /api/v1/order/recall/order_data/{orderId}
   */
  getOrderDetails: async (orderId: number, priceViewOverride?: string): Promise<any> => {
    const priceView = priceViewOverride || getPriceView();
    try {
      return await unwrap<any>(
        axiosInstance.get(`/menu/order/order_data/${orderId}`, { params: { priceView } })
      );
    } catch (e) {
      console.warn(`[orderApi] getOrderDetails from /menu/order/order_data/${orderId} failed, trying /order/recall/order_data fallback:`, e);
      try {
        return await unwrap<any>(
          axiosInstance.get(`/order/recall/order_data/${orderId}`, { params: { priceView } })
        );
      } catch (err2) {
        console.warn(`[orderApi] fallback getOrderDetails with priceView failed, retrying without params:`, err2);
        try {
          return await unwrap<any>(
            axiosInstance.get(`/menu/order/order_data/${orderId}`)
          );
        } catch (err3) {
          return await unwrap<any>(
            axiosInstance.get(`/order/recall/order_data/${orderId}`)
          );
        }
      }
    }
  },

  /**
   * Explicitly fetches recall order details by order ID.
   * Primary: GET /api/v1/menu/order/order_data/{orderId}?priceView={priceView}
   * Fallback: GET /api/v1/order/recall/order_data/{orderId}
   */
  getRecallOrderDetails: async (orderId: number, priceViewOverride?: string): Promise<any> => {
    return orderApi.getOrderDetails(orderId, priceViewOverride);
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
  getCombinedOrderDetails: async (orderIds: number[], maxBaseOrderMapId: number = 999): Promise<any> => {
    // Axios array serialization for query params (OrderIds=1&OrderIds=2)
    const params = new URLSearchParams();
    orderIds.forEach(id => params.append('OrderIds', id.toString()));
    params.append('MaxBaseOrderMapId', maxBaseOrderMapId.toString());
    return unwrap<any>(
      axiosInstance.get("/order/combine/combined-orders", { params })
    );
  },

  /**
   * Updates an existing order.
   * PUT /api/menu/order/{orderId}
   */
  updateOrder: async (orderId: number, order: import("../types").MenuOrderUpdateRequest): Promise<MenuOrderResponse> => {
    const payload = { ...order };
    delete (payload as any).voucherDate;
    delete (payload as any).dayId;
    delete (payload as any).shiftId;
    delete (payload as any).createdAt;
    delete (payload as any).transDate;
    delete (payload as any).callBack;

    if (payload.details && Array.isArray(payload.details)) {
      // Skip re-sanitization for details already marked as tax-exclusive (to prevent double-division by VAT)
      payload.details = payload.details.map((d: any) => d.isPriceTaxExclusive === true ? d : sanitizeTaxExclusiveDetail(d));
      const totalDetailGross = payload.details.reduce((sum: number, d: any) => sum + Number(d.price || 0) * Number(d.qty || 1), 0);
      const totalModifierGross = Array.isArray(payload.modifiers)
        ? payload.modifiers.reduce((sum: number, m: any) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0)
        : 0;
      const totalGrossExcl = roundCalc(totalDetailGross + totalModifierGross);
      const lineDiscounts = payload.details.reduce((sum: number, d: any) => sum + Number(d.discAmount || 0), 0);
      const isBillDisc = Boolean(
        (payload as any).isBillDiscount ||
        Number((payload as any).billDiscountValue || (payload as any).billDiscount || 0) > 0 ||
        (Number(payload.discAmount || 0) > 0 && lineDiscounts === 0)
      );

      if (isBillDisc) {
        payload.details.forEach((d: any) => {
          d.discAmount = 0;
          d.discPer = 0;
        });
        payload.discAmount = roundCalc(Number(payload.discAmount || 0));
        payload.vatExclAmount = roundCalc(Math.max(0, totalGrossExcl - payload.discAmount));
      } else {
        payload.discAmount = 0;
        payload.discPer = 0;
        payload.vatExclAmount = roundCalc(Math.max(0, totalGrossExcl - lineDiscounts));
      }

      const isVatEnabled = getVatStatus();
      const isComplimentary = Boolean((payload as any).complimentaryStatus || Number(payload.discPer) === 100);
      if (isVatEnabled && !isComplimentary && (!payload.vatAmount || Number(payload.vatAmount) <= 0)) {
        const payableBase = Math.max(0, Number(payload.netAmount || 0) - Number(payload.deliveryCharge || 0));
        if (payableBase > payload.vatExclAmount) {
          payload.vatAmount = roundCalc(payableBase - payload.vatExclAmount);
        }
      }
    }

    return unwrap<MenuOrderResponse>(
      axiosInstance.put(`/menu/order/${orderId}`, payload)
    );
  },

  /**
   * Splits an existing order into multiple new orders.
   * POST /api/order/split
   */
  splitOrder: async (payload: import("../types").SplitOrderRequest): Promise<MenuOrderResponse> => {
    const postPayload = { ...payload } as any;
    if (postPayload.voucherDate) {
      postPayload.voucherDate = postPayload.voucherDate.includes("T")
        ? postPayload.voucherDate.split("T")[0]
        : postPayload.voucherDate;
    } else {
      postPayload.voucherDate = new Date().toISOString().split("T")[0];
    }
    if (postPayload.orders && Array.isArray(postPayload.orders)) {
      postPayload.orders = postPayload.orders.map((ord: any) => {
        if (ord.details && Array.isArray(ord.details)) {
          // Skip re-sanitization for details already marked as tax-exclusive (to prevent double-division by VAT)
          ord.details = ord.details.map((d: any) => d.isPriceTaxExclusive === true ? d : sanitizeTaxExclusiveDetail(d));
          const totalDetailGross = ord.details.reduce((sum: number, d: any) => sum + Number(d.price || 0) * Number(d.qty || 1), 0);
          const totalModifierGross = Array.isArray(ord.modifiers)
            ? ord.modifiers.reduce((sum: number, m: any) => sum + Number(m.amount !== undefined ? m.amount : (Number(m.price || 0) * Number(m.qty || 1))), 0)
            : 0;
          const totalGrossExcl = roundCalc(totalDetailGross + totalModifierGross);
          const lineDiscounts = ord.details.reduce((sum: number, d: any) => sum + Number(d.discAmount || 0), 0);
          const isBillDisc = Boolean(
            (ord as any).isBillDiscount ||
            Number((ord as any).billDiscountValue || (ord as any).billDiscount || 0) > 0 ||
            (Number(ord.discAmount || 0) > 0 && lineDiscounts === 0)
          );

          if (isBillDisc) {
            ord.details.forEach((d: any) => {
              d.discAmount = 0;
              d.discPer = 0;
            });
            ord.discAmount = roundCalc(Number(ord.discAmount || 0));
            ord.vatExclAmount = roundCalc(Math.max(0, totalGrossExcl - ord.discAmount));
          } else {
            ord.discAmount = 0;
            ord.discPer = 0;
            ord.vatExclAmount = roundCalc(Math.max(0, totalGrossExcl - lineDiscounts));
          }

          const isVatEnabled = getVatStatus();
          const isComplimentary = Boolean((ord as any).complimentaryStatus || Number(ord.discPer) === 100);
          if (isVatEnabled && !isComplimentary && (!ord.vatAmount || Number(ord.vatAmount) <= 0)) {
            const payableBase = Math.max(0, Number(ord.netAmount || 0) - Number(ord.deliveryCharge || 0));
            if (payableBase > ord.vatExclAmount) {
              ord.vatAmount = roundCalc(payableBase - ord.vatExclAmount);
            }
          }
        }
        return ord;
      });
    }

    return unwrap<MenuOrderResponse>(
      axiosInstance.post("/order-split", postPayload)
    );
  },

  /**
   * Updates driver for a recall order.
   * PUT /api/order/recall/{orderId}/driver?driverId={driverId}
   */
  updateRecallDriver: async (orderId: number, driverId: number): Promise<{ isSuccess: boolean; message: string }> => {
    return unwrap<{ isSuccess: boolean; message: string }>(
      axiosInstance.put(`/order/recall/${orderId}/driver`, {}, { params: { driverId } })
    );
  }
};

