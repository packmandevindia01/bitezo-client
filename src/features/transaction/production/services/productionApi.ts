/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { ProductionPayload, ProductionDetailParams } from "../types";

function unwrap<T>(data: ApiResponse<T>): T {
  if (!data.isSuccess) {
    const firstError = data.errors && data.errors.length > 0 ? data.errors[0].message : null;
    throw new Error(firstError || data.message || "Operation failed");
  }
  return data.data;
}

const BASE_URL = "/production";

export const productionApi = {
  getBranchList: async () => {
    const response = await axiosInstance.get<ApiResponse<{ branchId: number; branchName: string }[]>>(`${BASE_URL}/list-branch-name`);
    return unwrap(response.data);
  },

  getEmployeeList: async (branchId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ empId: number; empName: string }[]>>(`${BASE_URL}/list-employee-name`, { params: { branchId } });
    return unwrap(response.data);
  },

  getProductionNumber: async (branchId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ productionNo: number }>>(`${BASE_URL}/production-number/${branchId}`);
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

  getUnitCost: async (productId: number, unitId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ cost: number }>>(`/purchase-invoice/${productId}/unit-cost/${unitId}`);
    return unwrap(response.data);
  },

  getUnitListByName: async (unitCategory: string) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } });
    return unwrap(response.data);
  },

  getBomDetails: async (params: { BranchId: number; ProductId: number; UnitId: number }) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/bom-details`, { params });
    return unwrap(response.data);
  },

  getBomDataById: async (transId: number) => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/bom-data/${transId}`);
    return unwrap(response.data);
  },

  getProductionById: async (transId: number) => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`);
    return unwrap(response.data);
  },

  createProduction: async (payload: ProductionPayload) => {
    const response = await axiosInstance.post<ApiResponse<any>>(BASE_URL, payload);
    return unwrap(response.data);
  },

  updateProduction: async (transId: number, payload: ProductionPayload) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, payload);
    return unwrap(response.data);
  },

  getProductionDetails: async (params: ProductionDetailParams) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params });
    return unwrap(response.data);
  },

  cancelProduction: async (transId: number) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`);
    return unwrap(response.data);
  }
};
