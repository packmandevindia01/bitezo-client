import axiosInstance from "../../../../api/axiosInstance";
import type { 
  StockAdjustmentCreatePayload,
  StockAdjustmentUpdatePayload,
  StockAdjustmentDetailParams 
} from "../types";

export interface ApiResponse<T = any> {
  message?: string;
  data: T;
  isSuccess?: boolean;
  status?: number;
  errors?: any[];
}

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

  getUnitCost: async (productId: number, unitId: number): Promise<{ cost: number }> => {
    return unwrap<{ cost: number }>(
      axiosInstance.get<ApiResponse<{ cost: number }>>(`${BASE_URL}/${productId}/unit-cost/${unitId}`)
    );
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
