import axiosInstance from "../../../../api/axiosInstance";
import type {
  ReceiptAgainstMasterDataResponse,
  ReceiptAgainstAccount,
  ReceiptAgainstPendingInvoice,
  ReceiptAgainstCreatePayload,
  ReceiptAgainstUpdatePayload,
  ReceiptAgainstListItem,
  ReceiptAgainstDataResponse
} from "../types";

export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
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

export const receiptAgainstVoucherApi = {
  loadMasterData: async (branchId?: number): Promise<ReceiptAgainstMasterDataResponse> => {
    const params: Record<string, any> = {};
    if (branchId !== undefined && branchId !== null && branchId > 0) {
      params.branchId = branchId;
    }
    return unwrap<ReceiptAgainstMasterDataResponse>(
      axiosInstance.get<ApiResponse<ReceiptAgainstMasterDataResponse>>(`/receipt-against/load-master`, {
        params,
      })
    );
  },

  getAccountList: async (accountCode = "", accountName = ""): Promise<ReceiptAgainstAccount[]> => {
    const params: Record<string, any> = {};
    if (accountCode) params.accountCode = accountCode;
    if (accountName) params.accountName = accountName;
    return unwrap<ReceiptAgainstAccount[]>(
      axiosInstance.get<ApiResponse<ReceiptAgainstAccount[]>>(`/receipt-against/account-list-name`, {
        params,
      })
    );
  },

  getVoucherNumber: async (seriesId: number, prefix: string = ""): Promise<{ voucherNo: string }> => {
    const data = await unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`/receipt-against/voucher-number/${seriesId}`, {
        params: { prefix: prefix || "" }
      })
    );
    if (typeof data === "string") return { voucherNo: data };
    return { voucherNo: data?.voucherNo || String(data || "") };
  },

  getPendingInvoices: async (
    branchId: number,
    customerId?: number,
    receiptId?: number
  ): Promise<ReceiptAgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    return unwrap<ReceiptAgainstPendingInvoice[]>(
      axiosInstance.get<ApiResponse<ReceiptAgainstPendingInvoice[]>>(`/receipt-against/pending-invoices`, {
        params: { 
          BranchId: branchId, 
          CustomerId: customerId || 0, 
          ReceiptId: receiptId || 0,
          Decimals: decimals
        },
      })
    );
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
    if (fromDate) params.FromDate = formatDateOnly(fromDate);
    if (toDate) params.ToDate = formatDateOnly(toDate);

    return unwrap<ReceiptAgainstPendingInvoice[]>(
      axiosInstance.get<ApiResponse<ReceiptAgainstPendingInvoice[]>>(`/receipt-against/pending-invoices/details`, { params })
    );
  },

  getReceiptAgainstVoucherList: async (
    branchId: number,
    fromDate?: string,
    toDate?: string,
    seriesId: number = 0
  ): Promise<ReceiptAgainstListItem[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const params: Record<string, any> = {
      BranchId: branchId,
      SeriesId: seriesId,
      Decimals: decimals,
    };
    if (fromDate) params.FromDate = formatDateOnly(fromDate);
    if (toDate) params.ToDate = formatDateOnly(toDate);

    return unwrap<ReceiptAgainstListItem[]>(
      axiosInstance.get<ApiResponse<ReceiptAgainstListItem[]>>(`/receipt-against/details`, {
        params,
      })
    );
  },

  getReceiptAgainstVoucherById: async (transId: number): Promise<ReceiptAgainstDataResponse> => {
    return unwrap<ReceiptAgainstDataResponse>(
      axiosInstance.get<ApiResponse<ReceiptAgainstDataResponse>>(`/receipt-against/data/${transId}`)
    );
  },

  createReceiptAgainstVoucher: async (payload: ReceiptAgainstCreatePayload): Promise<{ id: number }> => {
    return unwrap<{ id: number }>(
      axiosInstance.post<ApiResponse<{ id: number }>>(`/receipt-against`, payload)
    );
  },

  updateReceiptAgainstVoucher: async (transId: number, payload: ReceiptAgainstUpdatePayload): Promise<void> => {
    await unwrap<any>(axiosInstance.put(`/receipt-against/${transId}`, payload));
  },

  deleteReceiptAgainstVoucher: async (transId: number): Promise<void> => {
    await unwrap<any>(axiosInstance.put(`/receipt-against/cancel/${transId}`));
  },
};
