import axiosInstance from "../../../../api/axiosInstance";
import type { 
  ReceiptVoucherCreatePayload,
  ReceiptVoucherUpdatePayload,
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

export const receiptVoucherApi = {
  getLoadMaster: async (branchId?: number): Promise<ReceiptMasterData> => {
    const params: Record<string, any> = {};
    if (branchId !== undefined && branchId !== null && branchId > 0) {
      params.branchId = branchId;
    }
    return unwrap<ReceiptMasterData>(axiosInstance.get<ApiResponse<ReceiptMasterData>>(`/receipt/load-master`, {
      params
    }));
  },

  getAccountList: async (searchTerm?: string): Promise<ReceiptAccount[]> => {
    return unwrap<ReceiptAccount[]>(axiosInstance.get<ApiResponse<ReceiptAccount[]>>(`/receipt/account-list-name`, {
      params: { accountName: searchTerm || undefined }
    }));
  },

  getVoucherNumber: async (seriesId: number, prefix: string = ""): Promise<string> => {
    const data = await unwrap<any>(axiosInstance.get<ApiResponse<any>>(`/receipt/voucher-number/${seriesId}`, {
      params: { prefix: prefix || "" }
    }));
    if (typeof data === "string") return data;
    return data?.voucherNo || String(data || "");
  },

  getReceiptDetails: async (params: {
    BranchId: number;
    SeriesId?: number;
    FromDate: string;
    ToDate: string;
    VoucherNo?: string;
    AccountId?: number;
    Decimals: number;
  }): Promise<ReceiptListDto[]> => {
    const cleanParams: Record<string, any> = {
      BranchId: params.BranchId,
      SeriesId: params.SeriesId ?? 0,
      FromDate: formatDateOnly(params.FromDate),
      ToDate: formatDateOnly(params.ToDate),
      Decimals: params.Decimals ?? 3,
    };
    if (params.VoucherNo) cleanParams.VoucherNo = params.VoucherNo;
    if (params.AccountId) cleanParams.AccountId = params.AccountId;

    const data = await unwrap<ReceiptListDto[]>(
      axiosInstance.get<ApiResponse<ReceiptListDto[]>>(`/receipt/details`, { params: cleanParams })
    );
    return data || [];
  },

  getReceiptData: async (transId: number): Promise<ReceiptDataResponse> => {
    return unwrap<ReceiptDataResponse>(axiosInstance.get<ApiResponse<ReceiptDataResponse>>(`/receipt/data/${transId}`));
  },

  createReceipt: async (payload: ReceiptVoucherCreatePayload): Promise<any> => {
    return unwrap<any>(axiosInstance.post<ApiResponse<any>>(`/receipt`, payload));
  },

  updateReceipt: async (transId: number, payload: ReceiptVoucherUpdatePayload): Promise<void> => {
    await unwrap<any>(axiosInstance.put<ApiResponse<any>>(`/receipt/${transId}`, payload));
  },

  cancelReceipt: async (transId: number): Promise<void> => {
    await unwrap<any>(axiosInstance.put<ApiResponse<any>>(`/receipt/cancel/${transId}`));
  }
};
