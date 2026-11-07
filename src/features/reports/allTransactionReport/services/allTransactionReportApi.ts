import axiosInstance from "../../../../api/axiosInstance";
import type { AllTransactionReportData } from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";

export interface AllTransactionReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export const allTransactionReportApi = {
  getAllTransactionReport: async (params: AllTransactionReportParams) => {
    const response = await axiosInstance.get<{ data: AllTransactionReportData[] }>("/reports/all-transaction-report", { params });
    assertReportSuccess(response.data);
    return response.data.data || [];
  }
};
