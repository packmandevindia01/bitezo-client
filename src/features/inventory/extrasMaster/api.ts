import { unwrapMaster as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../category/types";
import type { ExtrasMasterForm, ExtrasMasterRecord, ExtrasDetailResponse } from "./schemas";

const BASE = "/extras";


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
