import axiosInstance from "../../../../api/axiosInstance";
import type { 
  ReceiptVoucherPayload, 
  ReceiptMasterData, 
  ReceiptAccount,
  ReceiptListDto,
  ReceiptDataResponse
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

export const receiptVoucherApi = {
  getLoadMaster: async (branchId: number): Promise<ReceiptMasterData> => {
    const { data } = await axiosInstance.get<ApiResponse<ReceiptMasterData>>(`/receipt/load-master`, {
      params: { branchId }
    });
    return unwrap(data);
  },

  getAccountList: async (searchTerm?: string): Promise<ReceiptAccount[]> => {
    const { data } = await axiosInstance.get<ApiResponse<ReceiptAccount[]>>(`/receipt/account-list-name`, {
      params: { accountName: searchTerm || undefined }
    });
    return unwrap(data);
  },

  getVoucherNumber: async (seriesId: number, prefix: string = "0"): Promise<string> => {
    const { data } = await axiosInstance.get<ApiResponse<{ voucherNo: string }>>(`/receipt/voucher-number/${seriesId}`, {
      params: { prefix }
    });
    return unwrap(data).voucherNo;
  },

  getReceiptDetails: async (params: {
    BranchId: number;
    SeriesId: number;
    FromDate: string;
    ToDate: string;
    Decimals: number;
  }): Promise<ReceiptListDto[]> => {
    const { data } = await axiosInstance.get<ApiResponse<ReceiptListDto[]>>(`/receipt/details`, { params });
    return unwrap(data);
  },

  getReceiptData: async (transId: number): Promise<ReceiptDataResponse> => {
    const { data } = await axiosInstance.get<ApiResponse<ReceiptDataResponse>>(`/receipt/data/${transId}`);
    return unwrap(data);
  },

  createReceipt: async (payload: ReceiptVoucherPayload): Promise<number> => {
    const { data } = await axiosInstance.post<ApiResponse<{ id: number }>>(`/receipt`, payload);
    return unwrap(data).id;
  },

  updateReceipt: async (transId: number, payload: ReceiptVoucherPayload): Promise<void> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>(`/receipt/${transId}`, payload);
    unwrap(data);
  },

  cancelReceipt: async (transId: number): Promise<void> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>(`/receipt/cancel/${transId}`);
    unwrap(data);
  }
};
