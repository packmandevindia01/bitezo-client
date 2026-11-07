import axiosInstance from "../../../api/axiosInstance";
import { notifyTransactionsUpdated } from "../../../utils/transactionSync";
import type { AgainstAccount, AgainstCreatePayload, AgainstDataResponse, AgainstListItem, AgainstMasterDataResponse, AgainstPendingInvoice, AgainstUpdatePayload } from "./againstVoucherTypes";
import { formatDateOnly } from "./purchaseDocument";

export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
  errors?: any[];
}

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

/** Payment and Receipt Against Vouchers: same endpoints under their own path; the party is a supplier or a customer. */
export const createAgainstVoucherApi = (kind: "payment" | "receipt", partyParam: "SupplierId" | "CustomerId") => ({
  loadMasterData: async (branchId?: number): Promise<AgainstMasterDataResponse> => {
    const params: Record<string, any> = {};
    if (branchId !== undefined && branchId !== null && branchId > 0) {
      params.branchId = branchId;
    }
    return unwrap<AgainstMasterDataResponse>(
      axiosInstance.get<ApiResponse<AgainstMasterDataResponse>>(`/${kind}-against/load-master`, {
        params,
      })
    );
  },

  getAccountList: async (accountCode = "", accountName = ""): Promise<AgainstAccount[]> => {
    const params: Record<string, any> = {};
    if (accountCode) params.accountCode = accountCode;
    if (accountName) params.accountName = accountName;
    return unwrap<AgainstAccount[]>(
      axiosInstance.get<ApiResponse<AgainstAccount[]>>(`/${kind}-against/account-list-name`, {
        params,
      })
    );
  },

  getVoucherNumber: async (seriesId: number, prefix: string = ""): Promise<{ voucherNo: string }> => {
    const data = await unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`/${kind}-against/voucher-number/${seriesId}`, {
        params: { prefix: prefix || "" }
      })
    );
    if (typeof data === "string") return { voucherNo: data };
    return { voucherNo: data?.voucherNo || String(data || "") };
  },

  getPendingInvoices: async (
    branchId: number,
    partyId?: number,
    receiptId?: number
  ): Promise<AgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    return (await unwrap<AgainstPendingInvoice[]>(
      axiosInstance.get<ApiResponse<AgainstPendingInvoice[]>>(`/${kind}-against/pending-invoices`, {
        params: { 
          BranchId: branchId, 
          [partyParam]: partyId || 0, 
          ReceiptId: receiptId || 0,
          Decimals: decimals
        },
      })
    )) || [];
  },

  getPendingInvoicesDetails: async (
    branchId: number,
    partyId?: number,
    receiptId?: number,
    fromDate?: string,
    toDate?: string
  ): Promise<AgainstPendingInvoice[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const params: any = { 
      BranchId: branchId, 
      [partyParam]: partyId || 0, 
      ReceiptId: receiptId || 0,
      Decimals: decimals
    };
    if (fromDate) params.FromDate = formatDateOnly(fromDate);
    if (toDate) params.ToDate = formatDateOnly(toDate);

    return (await unwrap<AgainstPendingInvoice[]>(
      axiosInstance.get<ApiResponse<AgainstPendingInvoice[]>>(`/${kind}-against/pending-invoices/details`, { params })
    )) || [];
  },

  getList: async (
    branchId: number,
    fromDate?: string,
    toDate?: string,
    seriesId: number = 0
  ): Promise<AgainstListItem[]> => {
    const decimals = parseInt(localStorage.getItem("decimalPart") || "3", 10);
    const params: Record<string, any> = {
      BranchId: branchId,
      SeriesId: seriesId,
      Decimals: decimals,
    };
    if (fromDate) params.FromDate = formatDateOnly(fromDate);
    if (toDate) params.ToDate = formatDateOnly(toDate);

    return (await unwrap<AgainstListItem[]>(
      axiosInstance.get<ApiResponse<AgainstListItem[]>>(`/${kind}-against/details`, {
        params,
      })
    )) || [];
  },

  getById: async (transId: number): Promise<AgainstDataResponse> => {
    return unwrap<AgainstDataResponse>(
      axiosInstance.get<ApiResponse<AgainstDataResponse>>(`/${kind}-against/data/${transId}`)
    );
  },

  create: async (payload: AgainstCreatePayload): Promise<{ id: number }> => {
    const res = await unwrap<{ id: number }>(axiosInstance.post<ApiResponse<{ id: number }>>(`/${kind}-against`, payload));
    notifyTransactionsUpdated(kind);
    return res;
  },

  update: async (transId: number, payload: AgainstUpdatePayload): Promise<void> => {
    await unwrap<any>(axiosInstance.put(`/${kind}-against/${transId}`, payload));
    notifyTransactionsUpdated(kind);
  },

  cancel: async (transId: number): Promise<void> => {
    await unwrap<any>(axiosInstance.put(`/${kind}-against/cancel/${transId}`));
    notifyTransactionsUpdated(kind);
  },
});

export type AgainstVoucherApi = ReturnType<typeof createAgainstVoucherApi>;
