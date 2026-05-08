import axiosInstance from "../../../../api/axiosInstance";

export interface PayInOutRequest {
  inOut: "IN" | "OUT";
  voucherDate: string;
  description: string;
  amount: number;
  paymodeId: number;
  dayId: number;
  shiftId: number;
  createdAt: string;
}

export interface PayInOutUpdateRequest {
  transId: number;
  inOut: "IN" | "OUT";
  voucherDate: string;
  description: string;
  amount: number;
  paymodeId: number;
  updatedAt: string;
}

export interface PayInOutItem {
  transId: number;
  sNo: number;
  inOut: "IN" | "OUT";
  vchNo: number;
  date: string;
  description: string;
  amount: number;
  paymode: string;
}

export interface PayInOutDetail {
  inOut: "IN" | "OUT";
  vchNo: number;
  voucherDate: string;
  description: string;
  amount: number;
  dayId: number;
  shiftId: number;
  paymodeId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: string[];
  isSuccess: boolean;
}

export const payInOutService = {
  create: async (data: PayInOutRequest) => {
    const response = await axiosInstance.post<ApiResponse<{ id: number }>>("/pay-in-out", data);
    return response.data;
  },

  list: async (params: { fromDate: string; toDate: string; description?: string }) => {
    const response = await axiosInstance.get<ApiResponse<PayInOutItem[]>>("/pay-in-out/pay-in-out-list", { params });
    return response.data;
  },

  getById: async (transId: number) => {
    const response = await axiosInstance.get<ApiResponse<PayInOutDetail>>(`/pay-in-out/${transId}/pay-in-out-data`);
    return response.data;
  },

  update: async (transId: number, data: PayInOutUpdateRequest) => {
    const response = await axiosInstance.put<ApiResponse<{ id: number }>>(`/pay-in-out/${transId}`, data);
    return response.data;
  },

  cancel: async (transId: number) => {
    const response = await axiosInstance.post<ApiResponse<{ id: number }>>(`/pay-in-out/${transId}/cancel`, {});
    return response.data;
  }
};
