import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  VoucherSeriesDetail, 
  VoucherSeriesPayload 
} from "../types";

const BASE = "/voucherseries";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg = envelope.message ?? "An unexpected error occurred.";
    throw new Error(msg);
  }

  return envelope.data;
}

export const voucherseriesService = {
  list(): Promise<any[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<any[]>>(`${BASE}/voucherseries-list`)
    );
  },

  getById(voucherId: number): Promise<VoucherSeriesDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<VoucherSeriesDetail>>(`${BASE}/${voucherId}/voucherid-data`)
    );
  },

  create(payload: VoucherSeriesPayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
        ...payload,
        createdAt: new Date().toISOString()
      })
    );
  },

  update(voucherId: number, payload: VoucherSeriesPayload): Promise<any> {
    return unwrap(
      axiosInstance.put<ApiResponse<any>>(`${BASE}/${voucherId}`, {
        ...payload,
        voucherId,
        updatedAt: new Date().toISOString()
      })
    );
  },

  remove(voucherId: number): Promise<any> {
    return unwrap(
      axiosInstance.delete<ApiResponse<any>>(`${BASE}/${voucherId}`)
    );
  },
} as const;
