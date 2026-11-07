import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type {
  PhysicalEntryCreatePayload,
  PhysicalEntryUpdatePayload,
  PhysicalEntryDetailParams,
} from "../types";

export { formatDateOnly };


const BASE_URL = "/physical-entry";

export const physicalEntryApi = {
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

  getPurchaseCostData: async (barcode: string): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/product-cost-data/${barcode}`)
    );
  },

  getUnitCost: async (productId: number, unitId: number): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/${productId}/unit-cost/${unitId}`)
    );
  },

  getUnitList: async (unitCategory: string): Promise<any[]> => {
    return unwrap<any[]>(
      axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/unit-list-name`, { params: { unitCategory } })
    );
  },

  getRefNumber: async (branchId: number): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/ref-number/${branchId}`)
    );
  },

  createPhysicalEntry: async (payload: PhysicalEntryCreatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transDate: formatDateOnly(payload.transDate),
      createdAt: payload.createdAt || new Date().toISOString(),
    };
    return unwrap<any>(axiosInstance.post<ApiResponse<void>>(BASE_URL, cleanPayload));
  },

  getPhysicalEntryDetails: async (params: PhysicalEntryDetailParams): Promise<any[]> => {
    const cleanParams: Record<string, any> = {};
    if (params.BranchId !== undefined) cleanParams.BranchId = params.BranchId;
    if (params.FromDate) cleanParams.FromDate = formatDateOnly(params.FromDate);
    if (params.ToDate) cleanParams.ToDate = formatDateOnly(params.ToDate);
    if (params.RefNo) cleanParams.RefNo = params.RefNo;
    cleanParams.Decimals = params.Decimals ?? 3;

    return unwrap<any[]>(axiosInstance.get<ApiResponse<any[]>>(`${BASE_URL}/details`, { params: cleanParams }));
  },

  getPhysicalEntryById: async (transId: number): Promise<any> => {
    return unwrap<any>(axiosInstance.get<ApiResponse<any>>(`${BASE_URL}/data/${transId}`));
  },

  updatePhysicalEntry: async (transId: number, payload: PhysicalEntryUpdatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transId,
      transDate: formatDateOnly(payload.transDate),
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };
    return unwrap<any>(axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/${transId}`, cleanPayload));
  },

  cancelPhysicalEntry: async (transId: number): Promise<any> => {
    return unwrap<any>(axiosInstance.put<ApiResponse<void>>(`${BASE_URL}/cancel/${transId}`));
  },

  getAsOnDateStock: async (productId: number, branchId: number, asOnDate?: string): Promise<any> => {
    const cleanDate = asOnDate ? formatDateOnly(asOnDate) : undefined;
    return unwrap<any>(
      axiosInstance.get<ApiResponse<any>>(`/product/as-on-date-stock/${productId}/${branchId}`, {
        params: { asOnDate: cleanDate }
      })
    );
  }
};
