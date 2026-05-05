import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type {
  ProviderSettingsPayload,
  ProviderSettingsMasterData,
  ProviderSettingsProduct,
  ProductSearchItem,
  ProviderSettingsListItem,
  ProviderSettingsData,
  AltNameItem,
} from "../types";

export const fetchProviderSettingsList = async () => {
  const { data } = await axiosInstance.get<ApiResponse<ProviderSettingsListItem[]>>(
    "/provider-settings/provider-settings-list"
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to fetch provider settings list");
  }
  return data.data || [];
};

export const fetchProviderSettingsData = async (transId: number) => {
  const { data } = await axiosInstance.get<ApiResponse<ProviderSettingsData>>(
    `/provider-settings/${transId}/provider-settings-data`
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to fetch provider settings data");
  }
  return data.data;
};

export const saveProviderSettings = async (payload: ProviderSettingsPayload) => {
  const { data } = await axiosInstance.post<ApiResponse<{ id: number }>>(
    "/provider-settings",
    payload
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to save provider settings");
  }
  return data;
};

export const updateProviderSettings = async (
  transId: number,
  payload: ProviderSettingsPayload
) => {
  const { data } = await axiosInstance.put<ApiResponse<{ id: number }>>(
    `/provider-settings/${transId}`,
    payload
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to update provider settings");
  }
  return data;
};

export const deleteProviderSettings = async (transId: number) => {
  const { data } = await axiosInstance.delete<ApiResponse<{ id: number }>>(
    `/provider-settings/${transId}`
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to delete provider settings");
  }
  return data;
};

export const loadMasterData = async () => {
  const { data } = await axiosInstance.get<ApiResponse<ProviderSettingsMasterData>>(
    "/provider-settings/load_master_data"
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load master data");
  }
  return data.data;
};

export const loadProducts = async (params: {
  categoryId?: number;
  subCategoryId?: number;
}) => {
  const { data } = await axiosInstance.get<ApiResponse<ProviderSettingsProduct[]>>(
    "/provider-settings/load_products",
    { params }
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load products");
  }
  return data.data || [];
};

export const searchProducts = async (productName: string) => {
  const { data } = await axiosInstance.get<ApiResponse<ProductSearchItem[]>>(
    "/product/list_product_name_alt",
    { params: { productName } }
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to search products");
  }
  return data.data || [];
};

// Used for Alt Name dropdown after a product is selected
export const fetchAltNames = async (productId: number) => {
  const { data } = await axiosInstance.get<ApiResponse<AltNameItem[]>>(
    "/product/list_alt_name",
    { params: { productId } }
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load alt names");
  }
  return data.data || [];
};

export const fetchUnitPrice = async (productId: number, unitId: number) => {
  const { data } = await axiosInstance.get<ApiResponse<{ price: number; isIncl: boolean }>>(
    "/product/get-unit-price",
    { params: { ProductId: productId, UnitId: unitId } }
  );
  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to fetch unit price");
  }
  return data.data;
};