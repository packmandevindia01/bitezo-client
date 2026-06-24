/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { RecipePayload } from "../types";

function unwrap<T>(data: ApiResponse<T>): T {
  // Support both `isSuccess` boolean and `status` codes for success checks
  if (data.isSuccess === false || (data.status && data.status >= 400)) {
    throw new Error(data.message || "Operation failed");
  }
  return data.data;
}

const BASE_URL = "/recipe";

export const recipeApi = {
  getBranchList: async () => {
    const response = await axiosInstance.get<ApiResponse<{ branchId: number; branchName: string }[]>>(`${BASE_URL}/list-branch-name`);
    return unwrap(response.data);
  },

  getFinishedProductListByName: async (productName: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/finished-product-list-name`, { params: { productName } });
    return unwrap(response.data);
  },

  getFinishedProductListByBarcode: async (barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/finished-product-list-barcode`, { params: { Barcode: barcode } });
    return unwrap(response.data);
  },

  getRawMaterialProductListByName: async (productName: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/raw-material-product-list-name`, { params: { productName } });
    return unwrap(response.data);
  },

  getRawMaterialProductListByBarcode: async (barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/raw-material-product-list-barcode`, { params: { Barcode: barcode } });
    return unwrap(response.data);
  },

  getProductUnitData: async (branchId: number, barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ unitId: number; unitCategory: string }>>(`${BASE_URL}/branches/${branchId}/barcode/${barcode}/product-unit-data`);
    return unwrap(response.data);
  },

  getProductCostData: async (barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; productCode: string; productName: string; baseUnitId: number; cost: number; altUnitId: number; vatId: number; vatName: string; vatValue: number; unitCategory: string }>>(`${BASE_URL}/product-cost-data/${barcode}`);
    return unwrap(response.data);
  },

  getUnitListByName: async (unitCategory: string) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } });
    return unwrap(response.data);
  },

  getRecipeNumber: async (branchId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ recipeNo: number }>>(`${BASE_URL}/recipe-number/${branchId}`);
    return unwrap(response.data);
  },

  getRecipeById: async (transId: number) => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`);
    return unwrap(response.data);
  },

  createRecipe: async (payload: RecipePayload) => {
    const response = await axiosInstance.post<ApiResponse<any>>(BASE_URL, payload);
    return unwrap(response.data);
  },

  updateRecipe: async (transId: number, payload: RecipePayload) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, payload);
    return unwrap(response.data);
  },

  getRecipeList: async (params?: { BranchId?: number; ProductId?: number; UnitId?: number; Decimals?: number }) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params });
    return unwrap(response.data);
  },

  deleteRecipe: async (transId: number) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`);
    return unwrap(response.data);
  }
};
