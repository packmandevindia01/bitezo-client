import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
import axiosInstance from "../../../../api/axiosInstance";
import type { 
  StockAdjustmentCreatePayload,
  StockAdjustmentUpdatePayload,
  StockAdjustmentDetailParams 
} from "../types";

import { parseUnitCost } from "../../shared/lineUnits";
export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
  status?: number;
  errors?: any[];
}

export { formatDateOnly };


const BASE_URL = "/stock-adjustment";

export const stockAdjustmentApi = {
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

  getProductListByName: async (productName: string): Promise<{ productId: number; productName: string; code: string; barcode: string }[]> => {
    return unwrap<{ productId: number; productName: string; code: string; barcode: string }[]>(
      axiosInstance.get<ApiResponse<{ productId: number; productName: string; code: string; barcode: string }[]>>(`${BASE_URL}/product-list-name`, { params: { productName } })
    );
  },

  getProductListByBarcode: async (barcode: string): Promise<{ productId: number; barcode: string }[]> => {
    return unwrap<{ productId: number; barcode: string }[]>(
      axiosInstance.get<ApiResponse<{ productId: number; barcode: string }[]>>(`${BASE_URL}/product-list-barcode`, { params: { Barcode: barcode } })
    );
  },

  getPurchaseCostData: async (barcode: string): Promise<{ productId: number; productCode: string; productName: string; baseUnitId: number; cost: number; altUnitId: number; vatId: number; vatName: string; vatValue: number; unitCategory: string; }> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/product-cost-data/${barcode}`)
    );
  },

  getUnitCost: async (productId: number, unitId: number): Promise<number> => {
    const data = await unwrap<unknown>(
      axiosInstance.get<ApiResponse<unknown>>(`${BASE_URL}/${productId}/unit-cost/${unitId}`)
    );
    return parseUnitCost(data);
  },

  getUnitList: async (unitCategory: string): Promise<{ unitId: number; unitName: string }[]> => {
    return unwrap<{ unitId: number; unitName: string }[]>(
      axiosInstance.get<ApiResponse<{ unitId: number; unitName: string }[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } })
    );
  },

  getRefNumber: async (branchId: number): Promise<{ refNo: number }> => {
    return unwrap<{ refNo: number }>(
      axiosInstance.get<ApiResponse<{ refNo: number }>>(`${BASE_URL}/ref-number/${branchId}`)
    );
  },

  createStockAdjustment: async (payload: StockAdjustmentCreatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transDate: formatDateOnly(payload.transDate),
    };
    return unwrap<any>(axiosInstance.post<ApiResponse<any>>(BASE_URL, cleanPayload));
  },

  getStockAdjustmentDetails: async (params: StockAdjustmentDetailParams): Promise<any[]> => {
    const cleanParams: Record<string, any> = {};
    if (params.BranchId !== undefined) cleanParams.BranchId = params.BranchId;
    if (params.FromDate) cleanParams.FromDate = formatDateOnly(params.FromDate);
    if (params.ToDate) cleanParams.ToDate = formatDateOnly(params.ToDate);
    if (params.RefNo) cleanParams.RefNo = params.RefNo;
    cleanParams.Decimals = params.Decimals ?? 3;

    return unwrap<any[]>(axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params: cleanParams }));
  },

  getStockAdjustmentById: async (transId: number): Promise<any> => {
    return unwrap<any>(axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`));
  },

  updateStockAdjustment: async (transId: number, payload: StockAdjustmentUpdatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transDate: formatDateOnly(payload.transDate),
    };
    return unwrap<any>(axiosInstance.put<ApiResponse<any>>(`${BASE_URL}/${transId}`, cleanPayload));
  },

  cancelStockAdjustment: async (transId: number): Promise<any> => {
    return unwrap<any>(axiosInstance.put<ApiResponse<any>>(`${BASE_URL}/cancel/${transId}`));
  }
};
