import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { 
  ProviderSettingsPayload, 
  ProviderSettingEntry, 
  ProviderSettingsMasterData, 
  ProviderSettingsProduct 
} from "../types";

export const fetchProviderSettings = async (payload: {
  providerId: number;
  date: string;
  branchId: number;
  categoryId: number;
  subCategoryId: number;
}) => {
  const { data } = await axiosInstance.post<ApiResponse<ProviderSettingEntry[]>>("/provider-settings/load", payload);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load provider settings");
  }
  return data.data || [];
};


export const saveProviderSettings = async (payload: ProviderSettingsPayload) => {
  const { data } = await axiosInstance.post<ApiResponse<unknown>>("/provider-settings/save", payload);
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to save provider settings");
  }
  return data;
};

export const deleteProviderSettings = async (params: { providerId: number; branchId: number }) => {
  const { data } = await axiosInstance.delete<ApiResponse<unknown>>("/provider-settings", { params });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to delete provider settings");
  }
  return data;
};

export const loadMasterData = async () => {
  const { data } = await axiosInstance.get<ApiResponse<ProviderSettingsMasterData>>("/provider-settings/load_master_data");
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load master data");
  }
  return data.data;
};

export const loadProducts = async (params: { categoryId?: number; subCategoryId?: number }) => {
  const { data } = await axiosInstance.get<ApiResponse<ProviderSettingsProduct[]>>("/provider-settings/load_products", { params });
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load products");
  }
  return data.data || [];
};

