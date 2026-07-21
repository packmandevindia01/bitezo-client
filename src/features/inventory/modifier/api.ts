import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../category/types";
import type { ModifierForm, ModifierRecord, ModifierDetailResponse } from "./schemas";

const BASE = "/modifier";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    const firstError = envelope.errors?.[0] as any;
    const msg = (typeof firstError === 'object' ? firstError.message : firstError) ?? envelope.message ?? "An error occurred";
    throw new Error(msg);
  }
  return envelope.data;
}

export const modifierApi = {
  list: (modName?: string): Promise<ModifierRecord[]> => {
    return unwrap(
      axiosInstance.get<ApiResponse<ModifierRecord[]>>(`${BASE}/modifier-list`, {
        params: { modName },
      })
    );
  },

  getById: (id: number): Promise<ModifierDetailResponse> => {
    return unwrap(
      axiosInstance.get<ApiResponse<ModifierDetailResponse>>(`${BASE}/${id}/modid-data`)
    );
  },

  create: (payload: ModifierForm): Promise<{ id: number }> => {
    return unwrap(axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
      ...payload,
      createdAt: new Date().toISOString()
    }));
  },

  update: (id: number, payload: ModifierForm): Promise<void> => {
    return unwrap(axiosInstance.put<ApiResponse<void>>(`${BASE}/${id}`, {
      ...payload,
      id,
      updatedAt: new Date().toISOString()
    }));
  },

  remove: (id: number): Promise<void> => {
    return unwrap(axiosInstance.delete<ApiResponse<void>>(`${BASE}/${id}`));
  },
};
