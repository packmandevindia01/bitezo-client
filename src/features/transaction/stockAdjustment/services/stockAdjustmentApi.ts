import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { StockAdjustmentPayload, StockAdjustmentDetailParams } from "../types";

function unwrap<T>(data: ApiResponse<T>): T {
  if (!data.isSuccess) {
    throw new Error(data.message || "Operation failed");
  }
  return data.data;
}

const BASE_URL = "/stock-adjustment";

export const stockAdjustmentApi = {
  getBranchList: async () => {
    const response = await axiosInstance.get<ApiResponse<{ branchId: number; branchName: string }[]>>(`${BASE_URL}/list-branch-name`);
    return unwrap(response.data);
  },

  getEmployeeList: async (branchId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ empId: number; empName: string }[]>>(`${BASE_URL}/list-employee-name`, { params: { branchId } });
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

  getPurchaseCostData: async (barcode: string) => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; productCode: string; productName: string; baseUnitId: number; cost: number; altUnitId: number; vatId: number; vatName: string; vatValue: number; unitCategory: string; }>>(`${BASE_URL}/product-cost-data/${barcode}`);
    return unwrap(response.data);
  },

  getUnitCost: async (productId: number, unitId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ cost: number }>>(`${BASE_URL}/${productId}/unit-cost/${unitId}`);
    return unwrap(response.data);
  },

  getUnitList: async (unitCategory: string) => {
    const response = await axiosInstance.get<ApiResponse<{ unitId: number; unitName: string }[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } });
    return unwrap(response.data);
  },

  getRefNumber: async (branchId: number) => {
    const response = await axiosInstance.get<ApiResponse<{ refNo: number }>>(`${BASE_URL}/ref-number/${branchId}`);
    return unwrap(response.data);
  },

  createStockAdjustment: async (payload: StockAdjustmentPayload) => {
    const response = await axiosInstance.post<ApiResponse<void>>(BASE_URL, payload);
    return unwrap(response.data);
  },

  getStockAdjustmentDetails: async (params: StockAdjustmentDetailParams) => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params });
    return unwrap(response.data);
  },

  getStockAdjustmentById: async (transId: number) => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`);
    return unwrap(response.data);
  },

  updateStockAdjustment: async (transId: number, payload: StockAdjustmentPayload) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, payload);
    return unwrap(response.data);
  },

  cancelStockAdjustment: async (transId: number) => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`);
    return unwrap(response.data);
  }
};
