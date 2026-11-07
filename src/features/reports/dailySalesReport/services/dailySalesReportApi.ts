import { unwrapResponse as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../productWisePurchaseReport/services/productWisePurchaseReportApi";
import type {
  DailySalesReportParams,
  DailySalesReportData,
  BranchOption,
} from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


export const getDailySalesReport = async (params: DailySalesReportParams) => {
  const response = await axiosInstance.get<ApiResponse<DailySalesReportData>>("/reports/daily-sales-report", {
    params,
  });
  assertReportSuccess(response.data);
  return unwrap<DailySalesReportData>(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};
