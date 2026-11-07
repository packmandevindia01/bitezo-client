import axiosInstance from "../../../api/axiosInstance";
import { notifyTransactionsUpdated } from "../../../utils/transactionSync";
import type { VoucherAccount, VoucherCreatePayload, VoucherDataResponse, VoucherListDto, VoucherMasterData, VoucherUpdatePayload } from "./voucherTypes";
import { formatDateOnly } from "./purchaseDocument";

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
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

/** Payment and Receipt Vouchers call the same endpoints under their own path. */
export const createVoucherApi = (path: "payment" | "receipt") => ({
  getLoadMaster: async (branchId?: number): Promise<VoucherMasterData> => {
    const params: Record<string, any> = {};
    if (branchId !== undefined && branchId !== null && branchId > 0) {
      params.branchId = branchId;
    }
    return unwrap<VoucherMasterData>(axiosInstance.get<ApiResponse<VoucherMasterData>>(`/${path}/load-master`, {
      params
    }));
  },

  getAccountList: async (searchTerm?: string): Promise<VoucherAccount[]> => {
    return unwrap<VoucherAccount[]>(axiosInstance.get<ApiResponse<VoucherAccount[]>>(`/${path}/account-list-name`, {
      params: { accountName: searchTerm || undefined }
    }));
  },

  getVoucherNumber: async (seriesId: number, prefix: string = ""): Promise<string> => {
    const data = await unwrap<any>(axiosInstance.get<ApiResponse<any>>(`/${path}/voucher-number/${seriesId}`, {
      params: { prefix: prefix || "" }
    }));
    if (typeof data === "string") return data;
    return data?.voucherNo || String(data || "");
  },

  getDetails: async (params: {
    BranchId: number;
    SeriesId?: number;
    FromDate: string;
    ToDate: string;
    VoucherNo?: string;
    AccountId?: number;
    Decimals: number;
  }): Promise<VoucherListDto[]> => {
    const cleanParams: Record<string, any> = {
      BranchId: params.BranchId,
      SeriesId: params.SeriesId ?? 0,
      FromDate: formatDateOnly(params.FromDate),
      ToDate: formatDateOnly(params.ToDate),
      Decimals: params.Decimals ?? 3,
    };
    if (params.VoucherNo) cleanParams.VoucherNo = params.VoucherNo;
    if (params.AccountId) cleanParams.AccountId = params.AccountId;

    const data = await unwrap<VoucherListDto[]>(
      axiosInstance.get<ApiResponse<VoucherListDto[]>>(`/${path}/details`, { params: cleanParams })
    );
    return data || [];
  },

  getData: async (transId: number): Promise<VoucherDataResponse> => {
    return unwrap<VoucherDataResponse>(axiosInstance.get<ApiResponse<VoucherDataResponse>>(`/${path}/data/${transId}`));
  },

  create: async (payload: VoucherCreatePayload): Promise<any> => {
    const res = await unwrap<any>(axiosInstance.post<ApiResponse<any>>(`/${path}`, payload));
    notifyTransactionsUpdated(path);
    return res;
  },

  update: async (transId: number, payload: VoucherUpdatePayload): Promise<void> => {
    await unwrap<any>(axiosInstance.put<ApiResponse<any>>(`/${path}/${transId}`, payload));
    notifyTransactionsUpdated(path);
  },

  cancel: async (transId: number): Promise<void> => {
    await unwrap<any>(axiosInstance.put<ApiResponse<any>>(`/${path}/cancel/${transId}`));
    notifyTransactionsUpdated(path);
  }
});

export type VoucherApi = ReturnType<typeof createVoucherApi>;
