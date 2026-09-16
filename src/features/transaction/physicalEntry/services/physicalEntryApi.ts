import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type { PhysicalEntryPayload, PhysicalEntryDetailParams } from "../types";

function unwrap<T = any>(data: any): T {
  if (data && typeof data === "object") {
    if ("isSuccess" in data) {
      if (!data.isSuccess) {
        throw new Error(data.message || "Operation failed");
      }
      return (data.data !== undefined ? data.data : data) as T;
    }
  }
  return (data?.data !== undefined ? data.data : data) as T;
}

const BASE_URL = "/physical-entry";

export const physicalEntryApi = {
  getBranchList: async (): Promise<{ branchId: number; branchName: string }[]> => {
    const response = await axiosInstance.get<ApiResponse<{ branchId: number; branchName: string }[]>>(`${BASE_URL}/list-branch-name`);
    return unwrap<{ branchId: number; branchName: string }[]>(response.data);
  },

  getEmployeeList: async (branchId: number): Promise<{ empId: number; empName: string }[]> => {
    const response = await axiosInstance.get<ApiResponse<{ empId: number; empName: string }[]>>(`${BASE_URL}/list-employee-name`, { params: { branchId } });
    return unwrap<{ empId: number; empName: string }[]>(response.data);
  },

  getProductListByName: async (productName: string): Promise<{ productId: number; productName: string; code: string; barcode: string }[]> => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/product-list-name`, { params: { productName } });
    return unwrap<{ productId: number; productName: string; code: string; barcode: string }[]>(response.data);
  },

  getProductListByBarcode: async (barcode: string): Promise<{ productId: number; barcode: string }[]> => {
    const response = await axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/product-list-barcode`, { params: { Barcode: barcode } });
    return unwrap<{ productId: number; barcode: string }[]>(response.data);
  },

  getPurchaseCostData: async (barcode: string): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/product-cost-data/${barcode}`);
    return unwrap<any>(response.data);
  },

  getUnitCost: async (productId: number, unitId: number): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/${productId}/unit-cost/${unitId}`);
    return unwrap<any>(response.data);
  },

  getUnitList: async (unitCategory: string): Promise<any[]> => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } });
    return unwrap<any[]>(response.data);
  },

  getRefNumber: async (branchId: number): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/ref-number/${branchId}`);
    return unwrap<any>(response.data);
  },

  createPhysicalEntry: async (payload: PhysicalEntryPayload): Promise<any> => {
    const response = await axiosInstance.post<ApiResponse<void>>(BASE_URL, payload);
    return unwrap<any>(response.data);
  },

  getPhysicalEntryDetails: async (params: PhysicalEntryDetailParams): Promise<any[]> => {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params });
    return unwrap<any[]>(response.data);
  },

  getPhysicalEntryById: async (transId: number): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`);
    return unwrap<any>(response.data);
  },

  updatePhysicalEntry: async (transId: number, payload: PhysicalEntryPayload): Promise<any> => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, payload);
    return unwrap<any>(response.data);
  },

  cancelPhysicalEntry: async (transId: number): Promise<any> => {
    const response = await axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`);
    return unwrap<any>(response.data);
  },

  getAsOnDateStock: async (productId: number, branchId: number, asOnDate?: string): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>(`/product/as-on-date-stock/${productId}/${branchId}`, {
      params: { asOnDate }
    });
    return unwrap<any>(response.data);
  }
};
