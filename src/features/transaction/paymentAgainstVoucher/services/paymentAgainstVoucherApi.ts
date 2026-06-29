import axiosInstance from "../../../../api/axiosInstance";
import type {
  PaymentAgainstMasterDataResponse,
  PaymentAgainstAccount,
  PaymentAgainstPendingInvoice,
  PaymentAgainstPayload,
  PaymentAgainstListItem,
  PaymentAgainstDataResponse
} from "../types";

export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
}

export const paymentAgainstVoucherApi = {
  // Load master data (series, branches, salesman, paymodes)
  loadMasterData: async (branchId: number): Promise<PaymentAgainstMasterDataResponse> => {
    const response = await axiosInstance.get<ApiResponse<PaymentAgainstMasterDataResponse>>(`/payment-against/load-master`, {
      params: { branchId },
    });
    return response.data.data;
  },

  // Get account list (suppliers/customers)
  getAccountList: async (accountCode = "", accountName = ""): Promise<PaymentAgainstAccount[]> => {
    const response = await axiosInstance.get<ApiResponse<PaymentAgainstAccount[]>>(`/payment-against/account-list-name`, {
      params: { accountCode, accountName },
    });
    return response.data.data;
  },

  // Get next voucher number for a series
  getVoucherNumber: async (seriesId: number): Promise<{ voucherNo: string }> => {
    const response = await axiosInstance.get<ApiResponse<{ voucherNo: string }>>(`/payment-against/voucher-number/${seriesId}`);
    return response.data.data;
  },

  getPendingInvoices: async (
    branchId: number,
    supplierId?: number,
    paymentId?: number
  ): Promise<PaymentAgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const response = await axiosInstance.get<ApiResponse<PaymentAgainstPendingInvoice[]>>(`/payment-against/pending-invoices`, {
      params: { 
        BranchId: branchId, 
        SupplierId: supplierId || 0, 
        PaymentId: paymentId || 0,
        Decimals: decimals
      },
    });
    return response.data.data;
  },

  // Get pending invoices for the multi-select modal (with dates)
  getPendingInvoicesDetails: async (
    branchId: number,
    supplierId?: number,
    paymentId?: number,
    fromDate?: string,
    toDate?: string
  ): Promise<PaymentAgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const params: any = { 
      BranchId: branchId, 
      SupplierId: supplierId || 0, 
      PaymentId: paymentId || 0,
      Decimals: decimals
    };
    if (fromDate) params.FromDate = fromDate;
    if (toDate) params.ToDate = toDate;

    const response = await axiosInstance.get<ApiResponse<PaymentAgainstPendingInvoice[]>>(`/payment-against/pending-invoices/details`, { params });
    return response.data.data;
  },

  // Get list of all payment against vouchers (for list page)
  getPaymentAgainstVoucherList: async (
    branchId: number,
    fromDate?: string,
    toDate?: string
  ): Promise<PaymentAgainstListItem[]> => {
    const response = await axiosInstance.get<ApiResponse<PaymentAgainstListItem[]>>(`/payment-against/details`, {
      params: { BranchId: branchId, FromDate: fromDate, ToDate: toDate },
    });
    return response.data.data;
  },

  // Get single payment against voucher by ID (for edit mode)
  getPaymentAgainstVoucherById: async (transId: number): Promise<PaymentAgainstDataResponse> => {
    const response = await axiosInstance.get<ApiResponse<PaymentAgainstDataResponse>>(`/payment-against/data/${transId}`);
    return response.data.data;
  },

  // Create a new payment against voucher
  createPaymentAgainstVoucher: async (payload: PaymentAgainstPayload): Promise<{ id: number }> => {
    const response = await axiosInstance.post<ApiResponse<{ id: number }>>(`/payment-against`, payload);
    return response.data.data;
  },

  // Update an existing payment against voucher
  updatePaymentAgainstVoucher: async (transId: number, payload: PaymentAgainstPayload): Promise<void> => {
    await axiosInstance.put<ApiResponse<null>>(`/payment-against/${transId}`, payload);
  },

  // Cancel/Delete a payment against voucher
  cancelPaymentAgainstVoucher: async (transId: number): Promise<void> => {
    await axiosInstance.put<ApiResponse<null>>(`/payment-against/cancel/${transId}`);
  },
};
