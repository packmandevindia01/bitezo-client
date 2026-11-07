import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type {
  ProductionCreatePayload,
  ProductionUpdatePayload,
  ProductionDetailParams,
} from "../types";

export { formatDateOnly };


const BASE_URL = "/production";

export const productionApi = {
  getBranchList: async (): Promise<{ branchId: number; branchName: string }[]> => {
    return unwrap<{ branchId: number; branchName: string }[]>(
      axiosInstance.get<ApiResponse<{ branchId: number; branchName: string }[]>>(`${BASE_URL}/list-branch-name`)
    );
  },

  getEmployeeList: async (branchId: number): Promise<{ empId: number; empName: string }[]> => {
    return unwrap<{ empId: number; empName: string }[]>(
      axiosInstance.get<ApiResponse<{ empId: number; empName: string }[]>>(`${BASE_URL}/list-employee-name`, { params: { branchId } })
    );
  },

  getProductionNumber: async (branchId: number): Promise<{ productionNo: number }> => {
    return unwrap<{ productionNo: number }>(
      axiosInstance.get<ApiResponse<{ productionNo: number }>>(`${BASE_URL}/production-number/${branchId}`)
    );
  },

  getFinishedProductListByName: async (productName: string): Promise<{ productId: number; productName: string; code: string; barcode: string }[]> => {
    return unwrap<{ productId: number; productName: string; code: string; barcode: string }[]>(
      axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/finished-product-list-name`, { params: { productName } })
    );
  },

  getFinishedProductListByBarcode: async (barcode: string): Promise<{ productId: number; barcode: string }[]> => {
    return unwrap<{ productId: number; barcode: string }[]>(
      axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/finished-product-list-barcode`, { params: { Barcode: barcode } })
    );
  },

  getRawMaterialProductListByName: async (productName: string): Promise<{ productId: number; productName: string; code: string; barcode: string }[]> => {
    return unwrap<{ productId: number; productName: string; code: string; barcode: string }[]>(
      axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/raw-material-product-list-name`, { params: { productName } })
    );
  },

  getRawMaterialProductListByBarcode: async (barcode: string): Promise<{ productId: number; barcode: string }[]> => {
    return unwrap<{ productId: number; barcode: string }[]>(
      axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/raw-material-product-list-barcode`, { params: { Barcode: barcode } })
    );
  },

  getProductUnitData: async (branchId: number, barcode: string): Promise<{ unitId: number; unitCategory: string }> => {
    return unwrap<{ unitId: number; unitCategory: string }>(
      axiosInstance.get<ApiResponse<{ unitId: number; unitCategory: string }>>(`${BASE_URL}/branches/${branchId}/barcode/${barcode}/product-unit-data`)
    );
  },

  getProductCostData: async (barcode: string): Promise<{ productId: number; productCode: string; productName: string; baseUnitId: number; cost: number; altUnitId: number; vatId: number; vatName: string; vatValue: number; unitCategory: string }> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/product-cost-data/${barcode}`)
    );
  },

  getUnitCost: async (productId: number, unitId: number): Promise<{ cost: number }> => {
    return unwrap<{ cost: number }>(
      axiosInstance.get<ApiResponse<{ cost: number }>>(`/purchase-invoice/${productId}/unit-cost/${unitId}`)
    );
  },

  getUnitListByName: async (unitCategory: string): Promise<any[]> => {
    return unwrap<any[]>(
      axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } })
    );
  },

  getBomDetails: async (params: { BranchId: number; ProductId: number; UnitId: number }): Promise<any[]> => {
    return unwrap<any[]>(
      axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/bom-details`, { params })
    );
  },

  getBomDataById: async (transId: number): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/bom-data/${transId}`)
    );
  },

  getProductionById: async (transId: number): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`)
    );
  },

  createProduction: async (payload: ProductionCreatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      productionDate: formatDateOnly(payload.productionDate),
      createdAt: payload.createdAt || new Date().toISOString(),
    };
    return unwrap<any>(axiosInstance.post<ApiResponse<any>>(BASE_URL, cleanPayload));
  },

  updateProduction: async (transId: number, payload: ProductionUpdatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transId,
      productionDate: formatDateOnly(payload.productionDate),
      updateAt: payload.updateAt || payload.updatedAt || new Date().toISOString(),
    };
    return unwrap<any>(axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, cleanPayload));
  },

  getProductionDetails: async (params: ProductionDetailParams): Promise<any[]> => {
    const cleanParams: Record<string, any> = {};
    if (params.BranchId !== undefined) cleanParams.BranchId = params.BranchId;
    if (params.ProductId !== undefined) cleanParams.ProductId = params.ProductId;
    if (params.UnitId !== undefined) cleanParams.UnitId = params.UnitId;
    if (params.FromDate) cleanParams.FromDate = formatDateOnly(params.FromDate);
    if (params.ToDate) cleanParams.ToDate = formatDateOnly(params.ToDate);
    cleanParams.Decimals = params.Decimals ?? 3;

    return unwrap<any[]>(axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params: cleanParams }));
  },

  cancelProduction: async (transId: number): Promise<any> => {
    return unwrap<any>(
      axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`)
    );
  }
};
