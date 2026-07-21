import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../category/types";
import type { ModifierTypeForm, ModifierTypeRecord } from "./schemas";

const BASE = "/modifiertype";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    const firstError = envelope.errors?.[0] as any;
    const msg = (typeof firstError === 'object' ? firstError.message : firstError) ?? envelope.message ?? "An error occurred";
    throw new Error(msg);
  }
  return envelope.data;
}

export const modifierTypeApi = {
  list: (query?: string): Promise<ModifierTypeRecord[]> => {
    const url = query 
      ? `${BASE}/modifiertype-list?typeName=${encodeURIComponent(query)}` 
      : `${BASE}/modifiertype-list`;
    return unwrap(axiosInstance.get<ApiResponse<ModifierTypeRecord[]>>(url));
  },

  getById: (typeId: number): Promise<ModifierTypeRecord> => {
    return unwrap(axiosInstance.get<ApiResponse<ModifierTypeRecord>>(`${BASE}/${typeId}/typeid-data`));
  },

  create: (payload: ModifierTypeForm): Promise<{ id: number }> => {
    return unwrap(axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
      ...payload,
      createdAt: new Date().toISOString()
    }));
  },

  update: (typeId: number, payload: ModifierTypeForm): Promise<{ id: number }> => {
    return unwrap(axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${typeId}`, {
      ...payload,
      typeId,
      updatedAt: new Date().toISOString()
    }));
  },

  remove: (typeId: number): Promise<{ id: number }> => {
    return unwrap(axiosInstance.delete<ApiResponse<{ id: number }>>(`${BASE}/${typeId}`));
  },
};
