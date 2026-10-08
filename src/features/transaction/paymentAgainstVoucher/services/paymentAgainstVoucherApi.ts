import axiosInstance from "../../../../api/axiosInstance";
import type {
  PaymentAgainstMasterDataResponse,
  PaymentAgainstAccount,
  PaymentAgainstPendingInvoice,
  PaymentAgainstCreatePayload,
  PaymentAgainstUpdatePayload,
  PaymentAgainstListItem,
  PaymentAgainstDataResponse
} from "../types";

export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
  status?: number;
  errors?: any[];
}

export const formatDateOnly = (dateVal: string | Date | undefined | null): string => {
  if (!dateVal) return new Date().toISOString().split("T")[0];
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("T")) return trimmed.split("T")[0];
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }
  const d = dateVal;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function unwrap<T>(promise: Promise<{ data: any }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (envelope && (envelope.isSuccess === false || (envelope.status && envelope.status >= 400))) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.code) : firstError) 
                  ?? envelope.message 
                  ?? "Operation failed";
      throw new Error(msg);
    }
    return envelope?.data !== undefined ? envelope.data : envelope;
  } catch (error: any) {
    const responseData = error.response?.data;
    if (responseData) {
      const envelope = responseData;
      if (envelope.errors && typeof envelope.errors === 'object') {
        if (!Array.isArray(envelope.errors)) {
          const firstKey = Object.keys(envelope.errors)[0];
          const firstErr = envelope.errors[firstKey];
          const msg = Array.isArray(firstErr) ? firstErr[0] : firstErr;
          throw new Error(`${firstKey}: ${msg}`);
        } else if (envelope.errors.length > 0) {
          const firstErr = envelope.errors[0];
          const msg = typeof firstErr === 'object' ? (firstErr.message || firstErr.code) : firstErr;
          throw new Error(msg || envelope.message || "An unexpected error occurred.");
        }
      }
      throw new Error(envelope.message || envelope.title || "Request failed");
    }
    throw error;
  }
}

export const paymentAgainstVoucherApi = {
  // Load master data (series, branches, salesman, paymodes)
  loadMasterData: async (branchId?: number): Promise<PaymentAgainstMasterDataResponse> => {
    const params: Record<string, any> = {};
    if (branchId !== undefined && branchId !== null && branchId > 0) {
      params.branchId = branchId;
    }
    return unwrap<PaymentAgainstMasterDataResponse>(
      axiosInstance.get<ApiResponse<PaymentAgainstMasterDataResponse>>(`/payment-against/load-master`, {
        params,
      })
    );
  },

  // Get account list (suppliers/customers)
  getAccountList: async (accountCode = "", accountName = ""): Promise<PaymentAgainstAccount[]> => {
    const params: Record<string, any> = {};
    if (accountCode) params.accountCode = accountCode;
    if (accountName) params.accountName = accountName;
    return unwrap<PaymentAgainstAccount[]>(
      axiosInstance.get<ApiResponse<PaymentAgainstAccount[]>>(`/payment-against/account-list-name`, {
        params,
      })
    );
  },

  // Get next voucher number for a series
  getVoucherNumber: async (seriesId: number, prefix: string = ""): Promise<{ voucherNo: string }> => {
    const data = await unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`/payment-against/voucher-number/${seriesId}`, {
        params: { prefix: prefix || "" }
      })
    );
    if (typeof data === "string") return { voucherNo: data };
    return { voucherNo: data?.voucherNo || String(data || "") };
  },

  getPendingInvoices: async (
    branchId: number,
    supplierId?: number,
    paymentId?: number
  ): Promise<PaymentAgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const data = await unwrap<PaymentAgainstPendingInvoice[]>(
      axiosInstance.get<ApiResponse<PaymentAgainstPendingInvoice[]>>(`/payment-against/pending-invoices`, {
        params: { 
          BranchId: branchId, 
          SupplierId: supplierId || 0, 
          PaymentId: paymentId || 0,
          Decimals: decimals
        },
      })
    );
    return data || [];
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
    const params: Record<string, any> = { 
      BranchId: branchId, 
      SupplierId: supplierId || 0, 
      PaymentId: paymentId || 0,
      Decimals: decimals
    };
    if (fromDate) params.FromDate = formatDateOnly(fromDate);
    if (toDate) params.ToDate = formatDateOnly(toDate);

    const data = await unwrap<PaymentAgainstPendingInvoice[]>(
      axiosInstance.get<ApiResponse<PaymentAgainstPendingInvoice[]>>(`/payment-against/pending-invoices/details`, { params })
    );
    return data || [];
  },

  // Get list of all payment against vouchers (for list page)
  getPaymentAgainstVoucherList: async (
    params: {
      BranchId: number;
      SeriesId?: number;
      FromDate?: string;
      ToDate?: string;
      VoucherNo?: string;
      AccountId?: number;
      Decimals?: number;
    } | number,
    fromDate?: string,
    toDate?: string
  ): Promise<PaymentAgainstListItem[]> => {
    let cleanParams: Record<string, any> = {};
    if (typeof params === "number") {
      cleanParams = {
        BranchId: params,
        SeriesId: 0,
        FromDate: formatDateOnly(fromDate),
        ToDate: formatDateOnly(toDate),
        Decimals: parseInt(localStorage.getItem("decimalPart") || "3", 10),
      };
    } else {
      cleanParams = {
        BranchId: params.BranchId,
        SeriesId: params.SeriesId ?? 0,
        FromDate: formatDateOnly(params.FromDate),
        ToDate: formatDateOnly(params.ToDate),
        Decimals: params.Decimals ?? parseInt(localStorage.getItem("decimalPart") || "3", 10),
      };
      if (params.VoucherNo) cleanParams.VoucherNo = params.VoucherNo;
      if (params.AccountId) cleanParams.AccountId = params.AccountId;
    }

    const data = await unwrap<PaymentAgainstListItem[]>(
      axiosInstance.get<ApiResponse<PaymentAgainstListItem[]>>(`/payment-against/details`, {
        params: cleanParams
      })
    );
    return data || [];
  },

  // Get single payment against voucher by ID (for edit mode)
  getPaymentAgainstVoucherById: async (transId: number): Promise<PaymentAgainstDataResponse> => {
    return unwrap<PaymentAgainstDataResponse>(
      axiosInstance.get<ApiResponse<PaymentAgainstDataResponse>>(`/payment-against/data/${transId}`)
    );
  },

  // Create a new payment against voucher
  createPaymentAgainstVoucher: async (payload: PaymentAgainstCreatePayload): Promise<{ id: number }> => {
    return unwrap<{ id: number }>(axiosInstance.post<ApiResponse<{ id: number }>>(`/payment-against`, payload));
  },

  // Update an existing payment against voucher
  updatePaymentAgainstVoucher: async (transId: number, payload: PaymentAgainstUpdatePayload): Promise<void> => {
    await unwrap<any>(axiosInstance.put<ApiResponse<null>>(`/payment-against/${transId}`, payload));
  },

  // Cancel/Delete a payment against voucher
  cancelPaymentAgainstVoucher: async (transId: number): Promise<void> => {
    await unwrap<any>(axiosInstance.put<ApiResponse<null>>(`/payment-against/cancel/${transId}`));
  },
};
