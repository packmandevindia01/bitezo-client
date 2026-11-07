import { unwrapTransaction as unwrap } from "@shared/api/unwrap";
import { formatDateOnly } from "@shared/lib/date";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  InternalStockTransferCreatePayload,
  InternalStockTransferUpdatePayload,
  StockTransferListParams,
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


export const internalStockTransferApi = {
  // 1. Get From Branches
  getFromBranches: async (): Promise<{ branchId: number; branchName: string }[]> => {
    return unwrap<{ branchId: number; branchName: string }[]>(
      axiosInstance.get("/stock-transfer/list-branch-name")
    );
  },

  // 2. Get To Branches based on From Branch
  getToBranches: async (branchId: number): Promise<{ branchId: number; branchName: string }[]> => {
    return unwrap<{ branchId: number; branchName: string }[]>(
      axiosInstance.get(`/stock-transfer/${branchId}/transfer-to-branches`)
    );
  },

  // 3. Get Employees for a Branch
  getEmployees: async (branchId: number): Promise<{ empId: number; empName: string }[]> => {
    return unwrap<{ empId: number; empName: string }[]>(
      axiosInstance.get("/stock-transfer/list-employee-name", { params: { branchId } })
    );
  },

  // 4. Get Ref Number for a Branch
  getRefNumber: async (branchId: number): Promise<string> => {
    const data = await unwrap<any>(axiosInstance.get(`/stock-transfer/ref-number/${branchId}`));
    return String(data?.refNo ?? data ?? "");
  },

  // 5. Product Search by Name
  getProductsByName: async (productName: string): Promise<any[]> => {
    return unwrap<any[]>(
      axiosInstance.get("/stock-transfer/product-list-name", { params: { productName } })
    );
  },

  // 6. Product Search by Barcode
  getProductsByBarcode: async (barcode: string): Promise<any[]> => {
    return unwrap<any[]>(
      axiosInstance.get("/stock-transfer/product-list-barcode", { params: { Barcode: barcode } })
    );
  },

  // 7. Get Product Cost Data
  getProductCostData: async (barcode: string): Promise<any> => {
    return unwrap<any>(
      axiosInstance.get(`/stock-transfer/product-cost-data/${barcode}`)
    );
  },

  // 8. Get Units
  getUnits: async (unitCategory: string): Promise<any[]> => {
    return unwrap<any[]>(
      axiosInstance.get("/stock-transfer/unit-list-name", { params: { unitCategory } })
    );
  },

  // 9. Get Unit Cost
  getUnitCost: async (productId: number, unitId: number): Promise<number> => {
    const data = await unwrap<any>(axiosInstance.get(`/stock-transfer/${productId}/unit-cost/${unitId}`));
    return parseUnitCost(data);
  },

  // 10. Save / Create Transfer
  createTransfer: async (payload: InternalStockTransferCreatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transDate: formatDateOnly(payload.transDate),
      createdAt: payload.createdAt || new Date().toISOString(),
    };
    return unwrap<any>(axiosInstance.post("/stock-transfer", cleanPayload));
  },

  // 11. Update Transfer
  updateTransfer: async (transId: number, payload: InternalStockTransferUpdatePayload): Promise<any> => {
    const cleanPayload = {
      ...payload,
      transId,
      transDate: formatDateOnly(payload.transDate),
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };
    return unwrap<any>(axiosInstance.put(`/stock-transfer/${transId}`, cleanPayload));
  },

  // 12. Cancel Transfer
  cancelTransfer: async (transId: number): Promise<any> => {
    return unwrap<any>(axiosInstance.put(`/stock-transfer/cancel/${transId}`));
  },

  // 13. Get List of Transfers
  getTransferList: async (params: StockTransferListParams): Promise<any[]> => {
    const cleanParams: Record<string, any> = {};
    if (params.FromBranchId !== undefined) cleanParams.FromBranchId = params.FromBranchId;
    if (params.ToBranchId !== undefined) cleanParams.ToBranchId = params.ToBranchId;
    if (params.FromDate) cleanParams.FromDate = formatDateOnly(params.FromDate);
    if (params.ToDate) cleanParams.ToDate = formatDateOnly(params.ToDate);
    if (params.RefNo) cleanParams.RefNo = params.RefNo;
    cleanParams.Decimals = params.Decimals ?? 3;

    return unwrap<any[]>(axiosInstance.get("/stock-transfer/details", { params: cleanParams }));
  },

  // 14. Get Single Transfer by ID
  getTransferById: async (transId: number): Promise<any> => {
    return unwrap<any>(axiosInstance.get(`/stock-transfer/data/${transId}`));
  }
};
