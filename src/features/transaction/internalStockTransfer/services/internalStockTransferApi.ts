import axiosInstance from "../../../../api/axiosInstance";

export interface StockTransferPayload {
  transId?: number;
  transDate: string;
  fromBranchId: number;
  toBranchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  details: {
    productId: number;
    unitId: number;
    qty: number;
    price: number;
    amount: number;
    baseQty: number;
  }[];
}

export const internalStockTransferApi = {
  // 1. Get From Branches
  getFromBranches: async () => {
    const response = await axiosInstance.get("/stock-transfer/list-branch-name");
    return response.data.data;
  },

  // 2. Get To Branches based on From Branch
  getToBranches: async (branchId: number) => {
    const response = await axiosInstance.get(`/stock-transfer/${branchId}/transfer-to-branches`);
    return response.data.data;
  },

  // 3. Get Employees for a Branch
  getEmployees: async (branchId: number) => {
    const response = await axiosInstance.get(`/stock-transfer/list-employee-name?branchId=${branchId}`);
    return response.data.data;
  },

  // 4. Get Ref Number for a Branch
  getRefNumber: async (branchId: number) => {
    const response = await axiosInstance.get(`/stock-transfer/ref-number/${branchId}`);
    return response.data.data.refNo;
  },

  // 5. Product Search by Name
  getProductsByName: async (productName: string) => {
    const response = await axiosInstance.get(`/stock-transfer/product-list-name?productName=${productName}`);
    return response.data.data;
  },

  // 6. Product Search by Barcode
  getProductsByBarcode: async (barcode: string) => {
    const response = await axiosInstance.get(`/stock-transfer/product-list-barcode?Barcode=${barcode}`);
    return response.data.data;
  },

  // 7. Get Product Cost Data
  getProductCostData: async (barcode: string) => {
    const response = await axiosInstance.get(`/stock-transfer/product-cost-data/${barcode}`);
    return response.data.data;
  },

  // 8. Get Units
  getUnits: async (unitCategory: string) => {
    const response = await axiosInstance.get(`/stock-transfer/unit-list-name?unitCategory=${unitCategory}`);
    return response.data.data;
  },

  // 9. Get Unit Cost
  getUnitCost: async (productId: number, unitId: number) => {
    const response = await axiosInstance.get(`/stock-transfer/${productId}/unit-cost/${unitId}`);
    return response.data.data.cost;
  },

  // 10. Save / Create Transfer
  createTransfer: async (data: StockTransferPayload) => {
    const response = await axiosInstance.post("/stock-transfer", data);
    return response.data;
  },

  // 11. Update Transfer
  updateTransfer: async (transId: number, data: StockTransferPayload) => {
    const response = await axiosInstance.put(`/stock-transfer/${transId}`, data);
    return response.data;
  },

  // 12. Cancel Transfer
  cancelTransfer: async (transId: number) => {
    const response = await axiosInstance.put(`/stock-transfer/cancel/${transId}`);
    return response.data;
  },

  // 13. Get List of Transfers
  getTransferList: async (params: { FromBranchId?: number; ToBranchId?: number; FromDate?: string; ToDate?: string; RefNo?: string; Decimals: number }) => {
    const response = await axiosInstance.get("/stock-transfer/details", { params });
    return response.data.data;
  },

  // 14. Get Single Transfer by ID
  getTransferById: async (transId: number) => {
    const response = await axiosInstance.get(`/stock-transfer/data/${transId}`);
    return response.data.data;
  }
};
