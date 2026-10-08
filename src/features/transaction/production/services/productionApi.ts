/* eslint-disable @typescript-eslint/no-explicit-any */
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import type {
  ProductionCreatePayload,
  ProductionUpdatePayload,
  ProductionDetailParams,
} from "../types";

export const formatDateOnly = (dateVal: string | Date | undefined | null): string => {
  if (!dateVal) return new Date().toISOString().split("T")[0];
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (trimmed.includes("T")) return trimmed.split("T")[0];
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return trimmed;
  }
  const d = dateVal;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function unwrap<T>(promise: Promise<{ data: any }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (envelope && (envelope.isSuccess === false || (envelope.status && envelope.status >= 400))) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.message || firstError.code) : firstError) 
                  ?? envelope.message 
                  ?? "Operation failed";
      throw new Error(msg);
    }
    return envelope?.data !== undefined ? envelope.data : envelope;
  } catch (error: any) {
    const responseData = error.response?.data;
    if (responseData) {
      const envelope = responseData;
      if (envelope.errors && typeof envelope.errors === 'object') {
        if (!Array.isArray(envelope.errors)) {
          const firstKey = Object.keys(envelope.errors)[0];
          const firstErr = envelope.errors[firstKey];
          const msg = Array.isArray(firstErr) ? firstErr[0] : firstErr;
          throw new Error(`${firstKey}: ${msg}`);
        } else if (envelope.errors.length > 0) {
          const firstErr = envelope.errors[0];
          const msg = typeof firstErr === 'object' ? (firstErr.message || firstErr.code) : firstErr;
          throw new Error(msg || envelope.message || "An unexpected error occurred.");
        }
      }
      throw new Error(envelope.message || envelope.title || "Request failed");
    }
    throw error;
  }
}

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
