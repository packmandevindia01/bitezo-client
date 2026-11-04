import axiosInstance from "../../../api/axiosInstance";
import { notifyTransactionsUpdated } from "../../../utils/transactionSync";
import { STORED_ORDER_PARAMS, applyStoredOrderView } from "./storedOrderView";
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  statusCode: number;
}

export interface SettledOrdersParams {
  DayId?: number;
  BranchId?: number;
  EmployeeId?: number;
  OrderTypeId?: number;
  SearchStatus?: string;
  SearchValue?: string;
  ProviderName?: string;
  Decimals?: number;
  DeliveryOutStatus?: boolean;
  DeliveryOutOnlyStatus?: boolean;
  IncludeCancelled?: boolean;
}

const unwrap = <T = any>(promise: Promise<{ data: any }>): Promise<ApiResponse<T>> => 
  promise.then(res => {
    const body = res?.data;
    if (Array.isArray(body)) {
      return { isSuccess: true, data: body as unknown as T, statusCode: 200, message: "" };
    }
    if (body && typeof body === 'object') {
      if (body.isSuccess === false) {
        throw new Error(body.message || "An unexpected error occurred");
      }
      let dataList: any[] = [];
      if (Array.isArray(body.data)) {
        dataList = body.data;
      } else if (body.data && typeof body.data === 'object') {
        const list = Array.isArray(body.data.items) ? body.data.items :
                     Array.isArray(body.data.records) ? body.data.records :
                     Array.isArray(body.data.orders) ? body.data.orders :
                     Array.isArray(body.data.result) ? body.data.result : null;
        if (list !== null) {
          dataList = list;
        } else {
          return { isSuccess: true, data: body.data as unknown as T, statusCode: body.statusCode || 200, message: body.message || null };
        }
      } else if (Array.isArray(body.result)) {
        dataList = body.result;
      }
      return { isSuccess: true, data: dataList as unknown as T, statusCode: body.statusCode || 200, message: body.message || null };
    }
    return { isSuccess: true, data: [] as unknown as T, statusCode: 200, message: null };
  });

export const settledOrdersApi = {
  getSettledOrders: async (params: SettledOrdersParams): Promise<ApiResponse<any>> => {
    return unwrap<any>(axiosInstance.get("/settled-orders", { params }));
  },

  /**
   * GET /api/v1/settled-orders/settled-data/{orderId}
   * Always requests stored (Exclusive) values; the Inclusive view is produced in the frontend
   * from each line's own saved rates (see services/storedOrderView.ts).
   */
  getSettledOrderDetails: async (
    orderId: number,
    options?: string | { priceView?: string; orderType?: string; serviceCharge?: number; levy?: number }
  ): Promise<ApiResponse<any>> => {
    const requestedView = typeof options === "string" ? options : options?.priceView;
    const res = await axiosInstance.get(`/settled-orders/settled-data/${orderId}`, {
      params: STORED_ORDER_PARAMS,
    });
    const body = res?.data;
    if (body && typeof body === 'object') {
      if (body.isSuccess === false) {
        throw new Error(body.message || "An unexpected error occurred");
      }
      const dataObj = body.data !== undefined ? body.data : body;
      return {
        isSuccess: true,
        data: applyStoredOrderView(dataObj, requestedView),
        statusCode: body.statusCode || res.status || 200,
        message: body.message || "",
      };
    }
    return { isSuccess: true, data: body, statusCode: res.status || 200, message: "" };
  },

  getSettledPrintData: async (saleId: number, orderId: number): Promise<ApiResponse<any>> => {
    try {
      const res = await axiosInstance.get(`/settled-orders/settled-print-data/${saleId}/${orderId}`);
      const body = res?.data;
      if (body && typeof body === 'object') {
        if (body.isSuccess === false) {
          throw new Error(body.message || "An unexpected error occurred");
        }
        const dataObj = body.data !== undefined ? body.data : body;
        return {
          isSuccess: true,
          data: dataObj,
          statusCode: body.statusCode || res.status || 200,
          message: body.message || "",
        };
      }
      return { isSuccess: true, data: body, statusCode: res.status || 200, message: "" };
    } catch (e: any) {
      console.warn("[settledOrdersApi] getSettledPrintData fallback failed:", e);
      return { isSuccess: false, data: null, statusCode: 500, message: e.message || "" };
    }
  },

  cancelSalesInvoice: async (orderId: number): Promise<ApiResponse<any>> => {
    const res = await unwrap<any>(axiosInstance.put(`/settled-orders/cancel-sales-invoice/${orderId}`));
    notifyTransactionsUpdated("sale");
    return res;
  }
};
