import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { ModifierTypeForm, ModifierTypeRecord } from "../types";

const BASE = "/modifiertype";

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (!res.data.isSuccess) throw new Error(res.data.message || "API Error");
    return res.data.data;
  });

export const modifierTypeService = {
  list: (query?: string): Promise<ModifierTypeRecord[]> => {
    const url = query ? `${BASE}/modifiertype-list?typeName=${encodeURIComponent(query)}` : `${BASE}/modifiertype-list`;
    return unwrap(axiosInstance.get<ApiResponse<ModifierTypeRecord[]>>(url));
  },

  getById: (typeId: number): Promise<ModifierTypeRecord> => {
    return unwrap(axiosInstance.get<ApiResponse<ModifierTypeRecord>>(`${BASE}/${typeId}/typeid-data`));
  },

  create: (payload: ModifierTypeForm & { createdAt: string }): Promise<{ id: number }> => {
    return unwrap(axiosInstance.post<ApiResponse<{ id: number }>>(BASE, payload));
  },

  update: (typeId: number, payload: ModifierTypeForm & { typeId: number, updatedAt: string }): Promise<{ id: number }> => {
    return unwrap(axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${typeId}`, payload));
  },

  remove: (typeId: number): Promise<{ id: number }> => {
    return unwrap(axiosInstance.delete<ApiResponse<{ id: number }>>(`${BASE}/${typeId}`));
  },
};
