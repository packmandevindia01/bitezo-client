import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../category/types";
import type { ExtrasMasterForm, ExtrasMasterRecord, ExtrasDetailResponse } from "./schemas";

const BASE = "/extras";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    const firstError = envelope.errors?.[0] as any;
    const msg = (typeof firstError === 'object' ? firstError.message : firstError) ?? envelope.message ?? "An error occurred";
    throw new Error(msg);
  }
  return envelope.data;
}

export const extrasMasterApi = {
  list: (extraName?: string): Promise<ExtrasMasterRecord[]> => {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasMasterRecord[]>>(`${BASE}/extras-list`, {
        params: { extraName },
      })
    );
  },

  getById: (extraId: number): Promise<ExtrasDetailResponse> => {
    return unwrap(
      axiosInstance.get<ApiResponse<ExtrasDetailResponse>>(`${BASE}/${extraId}/extrasid-data`)
    );
  },

  create: (payload: Omit<ExtrasMasterForm, "category"> & { createdAt: string }): Promise<{ extraId: number }> => {
    return unwrap(
      axiosInstance.post<ApiResponse<{ extraId: number }>>(BASE, payload)
    );
  },

  update: (extraId: number, payload: Omit<ExtrasMasterForm, "category"> & { id: number, updatedAt: string }): Promise<void> => {
    return unwrap(
      axiosInstance.put<ApiResponse<void>>(`${BASE}/${extraId}`, payload)
    );
  },

  remove: (extraId: number): Promise<void> => {
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(`${BASE}/${extraId}`)
    );
  },
};
