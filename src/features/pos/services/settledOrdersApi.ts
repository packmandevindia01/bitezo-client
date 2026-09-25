import axiosInstance from "../../../api/axiosInstance";
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
}

const unwrap = <T = any>(promise: Promise<{ data: any }>): Promise<ApiResponse<T>> => 
  promise.then(res => {
    const body = res?.data;
    if (Array.isArray(body)) {
      return { isSuccess: true, data: body as unknown as T, statusCode: 200, message: null };
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

const getPriceView = (): string => {
  try {
    const saved = localStorage.getItem('posConfigs');
    const full = saved ? JSON.parse(saved) : {};
    return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
  } catch {
    return 'Exclusive';
  }
};

export const settledOrdersApi = {
  getSettledOrders: async (params: SettledOrdersParams): Promise<ApiResponse<any>> => {
    return unwrap<any>(axiosInstance.get("/settled-orders", { params }));
  },

  getSettledOrderDetails: async (orderId: number): Promise<ApiResponse<any>> => {
    const priceView = getPriceView();
    return unwrap<any>(axiosInstance.get(`/settled-orders/settled-data/${orderId}`, { params: { priceView } }));
  },

  cancelSalesInvoice: async (orderId: number): Promise<ApiResponse<any>> => {
    return unwrap<any>(axiosInstance.put(`/settled-orders/cancel-sales-invoice/${orderId}`));
  }
};
