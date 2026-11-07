import { unwrapMaster as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../category/types";
import type { ModifierForm, ModifierRecord, ModifierDetailResponse } from "./schemas";

const BASE = "/modifier";


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
