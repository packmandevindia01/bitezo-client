import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  VoucherSeriesDetail, 
  VoucherSeriesPayload,
  VoucherSeriesRecord
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
  list(): Promise<VoucherSeriesRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<VoucherSeriesRecord[]>>(`${BASE}/voucherseries-list`)
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
  update(voucherId: number, payload: VoucherSeriesPayload): Promise<void> {
    return unwrap(
      axiosInstance.put<ApiResponse<void>>(`${BASE}/${voucherId}`, {
        ...payload,
        voucherId,
        updatedAt: new Date().toISOString()
      })
    );
  },

  remove(voucherId: number): Promise<void> {
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(`${BASE}/${voucherId}`)
    );
  },
} as const;
