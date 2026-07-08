import axiosInstance from "../../../../api/axiosInstance";
import type { AllTransactionReportData } from "../types";

export interface AllTransactionReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export const allTransactionReportApi = {
  getAllTransactionReport: async (params: AllTransactionReportParams) => {
    const response = await axiosInstance.get<{ data: AllTransactionReportData[] }>("/reports/all-transaction-report", { params });
    return response.data.data || [];
  }
};
