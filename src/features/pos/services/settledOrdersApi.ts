import axiosInstance from "../../../api/axiosInstance";
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  statusCode: number;
}

export interface SettledOrdersParams {
  DayId?: number;
  EmployeeId?: number;
  OrderTypeId?: number;
  SearchStatus?: string;
  SearchValue?: string;
  ProviderName?: string;
  Decimals?: number;
  DeliveryOutStatus?: boolean;
  DeliveryOutOnlyStatus?: boolean;
}

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (!res.data.isSuccess) {
      throw new Error(res.data.message || "An unexpected error occurred");
    }
    return res.data;
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
