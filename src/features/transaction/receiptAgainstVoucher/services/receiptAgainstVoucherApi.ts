import axiosInstance from "../../../../api/axiosInstance";
import type {
  ReceiptAgainstMasterDataResponse,
  ReceiptAgainstAccount,
  ReceiptAgainstPendingInvoice,
  ReceiptAgainstPayload,
  ReceiptAgainstListItem,
  ReceiptAgainstDataResponse
} from "../types";

export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
}

export const receiptAgainstVoucherApi = {
  loadMasterData: async (branchId: number): Promise<ReceiptAgainstMasterDataResponse> => {
    const response = await axiosInstance.get<ApiResponse<ReceiptAgainstMasterDataResponse>>(`/receipt-against/load-master`, {
      params: { branchId },
    });
    return response.data.data;
  },

  getAccountList: async (accountCode = "", accountName = ""): Promise<ReceiptAgainstAccount[]> => {
    const response = await axiosInstance.get<ApiResponse<ReceiptAgainstAccount[]>>(`/receipt-against/account-list-name`, {
      params: { accountCode, accountName },
    });
    return response.data.data;
  },

  getVoucherNumber: async (seriesId: number): Promise<{ voucherNo: string }> => {
    const response = await axiosInstance.get<ApiResponse<{ voucherNo: string }>>(`/receipt-against/voucher-number/${seriesId}`);
    return response.data.data;
  },

  getPendingInvoices: async (
    branchId: number,
    customerId?: number,
    receiptId?: number
  ): Promise<ReceiptAgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const response = await axiosInstance.get<ApiResponse<ReceiptAgainstPendingInvoice[]>>(`/receipt-against/pending-invoices`, {
      params: { 
        BranchId: branchId, 
        CustomerId: customerId || 0, 
        ReceiptId: receiptId || 0,
        Decimals: decimals
      },
    });
    return response.data.data;
  },


  getPendingInvoicesDetails: async (
    branchId: number,
    customerId?: number,
    receiptId?: number,
    fromDate?: string,
    toDate?: string
  ): Promise<ReceiptAgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const params: any = { 
      BranchId: branchId, 
      CustomerId: customerId || 0, 
      ReceiptId: receiptId || 0,
      Decimals: decimals
    };
    if (fromDate) params.FromDate = fromDate;
    if (toDate) params.ToDate = toDate;

    const response = await axiosInstance.get<ApiResponse<ReceiptAgainstPendingInvoice[]>>(`/receipt-against/pending-invoices/details`, { params });
    return response.data.data;
  },

  getReceiptAgainstVoucherList: async (
    branchId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<ReceiptAgainstListItem[]> => {
    const response = await axiosInstance.get<ApiResponse<ReceiptAgainstListItem[]>>(`/receipt-against/details`, {
      params: { BranchId: branchId, FromDate: fromDate, ToDate: toDate },
    });
    return response.data.data;
  },

  getReceiptAgainstVoucherById: async (transId: number): Promise<ReceiptAgainstDataResponse> => {
    const response = await axiosInstance.get<ApiResponse<ReceiptAgainstDataResponse>>(`/receipt-against/data/${transId}`);
    return response.data.data;
  },

  createReceiptAgainstVoucher: async (payload: ReceiptAgainstPayload): Promise<{ id: number }> => {
    const response = await axiosInstance.post<ApiResponse<{ id: number }>>(`/receipt-against`, payload);
    return response.data.data;
  },

  updateReceiptAgainstVoucher: async (transId: number, payload: ReceiptAgainstPayload): Promise<void> => {
    const updatePayload = { ...payload, transId };
    await axiosInstance.put(`/receipt-against/${transId}`, updatePayload);
  },

  deleteReceiptAgainstVoucher: async (transId: number): Promise<void> => {
    await axiosInstance.put(`/receipt-against/cancel/${transId}`);
  },
};
