import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { BomPayload, BomDetailParams } from "../types";

function unwrap<T>(data: ApiResponse<T>): T {
  if (!data.isSuccess) {
    throw new Error(data.message || "Operation failed");
  }
  return data.data;
}

const BASE_URL = "/bom";

export const bomApi = {
  getBranchList: async () => {
    const response = await axiosInstance.get<ApiResponse<{ branchId: number; branchName: string }[]>>(`${BASE_URL}/list-branch-name`);
    return unwrap(response.data);
  },

  getProductListByName: async (productName: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/product-list-name`, { params: { productName } });
    return unwrap(response.data);
  },

  getProductListByBarcode: async (barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/product-list-barcode`, { params: { Barcode: barcode } });
    return unwrap(response.data);
  },

  getProductUnitData: async (branchId: number, barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ unitId: number; unitCategory: string }>>(`${BASE_URL}/branches/${branchId}/barcode/${barcode}/product-unit-data`);
    return unwrap(response.data);
  },

  getUnitListByName: async (unitId: number, category: string) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/unit-list-name`, { params: { unitId, category } });
    return unwrap(response.data);
  },

  createBom: async (payload: BomPayload) => {
    const response = await axiosInstance.post<ApiResponse<void>>(BASE_URL, payload);
    return unwrap(response.data);
  },

  getBomDetails: async (params: BomDetailParams) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params });
    return unwrap(response.data);
  },

  getBomById: async (transId: number) => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`);
    return unwrap(response.data);
  },

  updateBom: async (transId: number, payload: BomPayload) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, payload);
    return unwrap(response.data);
  },

  cancelBom: async (transId: number) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`);
    return unwrap(response.data);
  }
};
