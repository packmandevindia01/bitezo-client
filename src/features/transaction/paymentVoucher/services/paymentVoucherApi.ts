import axiosInstance from "../../../../api/axiosInstance";
import type { 
  PaymentVoucherPayload, 
  PaymentMasterData, 
  PaymentAccount,
  PaymentListDto,
  PaymentDataResponse
} from "../types";

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess?: boolean;
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (response.isSuccess === false || (response.status && response.status >= 400)) {
    throw new Error(response.message || "Operation failed");
  }
  return response.data;
}

export const paymentVoucherApi = {
  getLoadMaster: async (branchId: number): Promise<PaymentMasterData> => {
    const { data } = await axiosInstance.get<ApiResponse<PaymentMasterData>>(`/payment/load-master`, {
      params: { branchId }
    });
    return unwrap(data);
  },

  getAccountList: async (searchTerm?: string): Promise<PaymentAccount[]> => {
    const { data } = await axiosInstance.get<ApiResponse<PaymentAccount[]>>(`/payment/account-list-name`, {
      params: { accountName: searchTerm || undefined }
    });
    return unwrap(data);
  },

  getVoucherNumber: async (seriesId: number, prefix: string = "0"): Promise<string> => {
    const { data } = await axiosInstance.get<ApiResponse<{ voucherNo: string }>>(`/payment/voucher-number/${seriesId}`, {
      params: { prefix }
    });
    return unwrap(data).voucherNo;
  },

  getPaymentDetails: async (params: {
    BranchId: number;
    SeriesId: number;
    FromDate: string;
    ToDate: string;
    Decimals: number;
  }): Promise<PaymentListDto[]> => {
    const { data } = await axiosInstance.get<ApiResponse<PaymentListDto[]>>(`/payment/details`, { params });
    return unwrap(data);
  },

  getPaymentData: async (transId: number): Promise<PaymentDataResponse> => {
    const { data } = await axiosInstance.get<ApiResponse<PaymentDataResponse>>(`/payment/data/${transId}`);
    return unwrap(data);
  },

  createPayment: async (payload: PaymentVoucherPayload): Promise<number> => {
    const { data } = await axiosInstance.post<ApiResponse<{ id: number }>>(`/payment`, payload);
    return unwrap(data).id;
  },

  updatePayment: async (transId: number, payload: PaymentVoucherPayload): Promise<void> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>(`/payment/${transId}`, payload);
    unwrap(data);
  },

  cancelPayment: async (transId: number): Promise<void> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>(`/payment/cancel/${transId}`);
    unwrap(data);
  }
};
