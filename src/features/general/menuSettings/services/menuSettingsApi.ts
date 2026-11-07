import { unwrapCoded as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  MutationResult,
  MenuSettingsListItem,
  MenuSettingsDetail,
  CreateMenuSettingsPayload,
  UpdateMenuSettingsPayload,
} from "../types";

const BASE = "/menu-time-settings";


export const menuSettingsApi = {
  list: (params?: { menuCode?: string; menuName?: string }): Promise<MenuSettingsListItem[]> => {
    return unwrap(
      axiosInstance.get<ApiResponse<MenuSettingsListItem[]>>(`${BASE}/menu-time-settings-list`, { params })
    );
  },

  getById: (menuId: number): Promise<MenuSettingsDetail> => {
    return unwrap(
      axiosInstance.get<ApiResponse<MenuSettingsDetail>>(`${BASE}/${menuId}/menu-time-settings-data`)
    );
  },

  create: (payload: CreateMenuSettingsPayload): Promise<MutationResult> => {
    return unwrap(axiosInstance.post<ApiResponse<MutationResult>>(BASE, payload));
  },

  update: (menuId: number, payload: UpdateMenuSettingsPayload): Promise<MutationResult> => {
    return unwrap(axiosInstance.put<ApiResponse<MutationResult>>(`${BASE}/${menuId}`, payload));
  },

  remove: (menuId: number): Promise<MutationResult> => {
    return unwrap(axiosInstance.delete<ApiResponse<MutationResult>>(`${BASE}/${menuId}`));
  },
} as const;
