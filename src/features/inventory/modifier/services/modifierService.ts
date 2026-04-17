import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { ModifierRecord } from "../types";

const BASE = "/modifier";

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (!res.data.isSuccess) throw new Error(res.data.message || "API Error");
    return res.data.data;
  });

export const modifierService = {
  list: (query?: string): Promise<ModifierRecord[]> => {
    const url = query ? `${BASE}/modifier-list?modName=${encodeURIComponent(query)}` : `${BASE}/modifier-list`;
    return unwrap(axiosInstance.get<ApiResponse<ModifierRecord[]>>(url));
  },

  getById: (id: number): Promise<{ modifier: ModifierRecord[], branch: { id: number, name: string }[] }> => {
    return unwrap(axiosInstance.get<ApiResponse<{ modifier: ModifierRecord[], branch: { id: number, name: string }[] }>>(`${BASE}/${id}/modid-data`));
  },

  create: (payload: any): Promise<{ id: number }> => {
    return unwrap(axiosInstance.post<ApiResponse<{ id: number }>>(BASE, payload));
  },

  update: (id: number, payload: any): Promise<{ id: number }> => {
    return unwrap(axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${id}`, payload));
  },

  remove: (id: number): Promise<{ id: number }> => {
    return unwrap(axiosInstance.delete<ApiResponse<{ id: number }>>(`${BASE}/${id}`));
  },
};
