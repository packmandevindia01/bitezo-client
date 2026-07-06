import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../productWisePurchaseReport/services/productWisePurchaseReportApi";
import type {
  DailySalesReportParams,
  DailySalesReportData,
  BranchOption,
} from "../types";

function unwrap<T>(response: any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

export const getDailySalesReport = async (params: DailySalesReportParams) => {
  const response = await axiosInstance.get<ApiResponse<DailySalesReportData>>("/reports/daily-sales-report", {
    params,
  });
  return unwrap<DailySalesReportData>(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};
