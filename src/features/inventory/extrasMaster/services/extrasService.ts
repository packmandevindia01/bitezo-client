import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { ExtrasMasterForm, ExtrasMasterRecord } from "../types";

const BASE = "/extras";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    const msg = envelope.errors?.[0]?.message ?? envelope.message ?? "An error occurred";
    throw new Error(msg);
  }
  return envelope.data;
}

export const extrasService = {
  list(extraName?: string): Promise<ExtrasMasterRecord[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasMasterRecord[]>>(`${BASE}/extras-list`, {
        params: { extraName },
      })
    );
  },

  getById(extraId: number): Promise<{ modifier: any[]; branch: any[] }> {
    return unwrap(
      axiosInstance.get<ApiResponse<{ modifier: any[]; branch: any[] }>>(`${BASE}/${extraId}/extrasid-data`)
    );
  },

  create(payload: any): Promise<{ extraId: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ extraId: number }>>(BASE, payload)
    );
  },

  update(extraId: number, payload: any): Promise<void> {
    return unwrap(
      axiosInstance.put<ApiResponse<void>>(`${BASE}/${extraId}`, payload)
    );
  },

  remove(extraId: number): Promise<void> {
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(`${BASE}/${extraId}`)
    );
  },
};
