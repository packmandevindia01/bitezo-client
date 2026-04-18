import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { ModifierRecord, ModifierDetailResponse } from "../types";

const BASE = "/modifier";

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (!res.data.isSuccess) throw new Error(res.data.message || "API Error");
    return res.data.data;
  });

export const modifierService = {
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

  create: (payload: any): Promise<{ id: number }> => {
    return unwrap(axiosInstance.post<ApiResponse<{ id: number }>>(BASE, payload));
  },

  update: (id: number, payload: any): Promise<void> => {
    return unwrap(axiosInstance.put<ApiResponse<void>>(`${BASE}/${id}`, payload));
  },

  remove: (id: number): Promise<void> => {
    return unwrap(axiosInstance.delete<ApiResponse<void>>(`${BASE}/${id}`));
  },
};
