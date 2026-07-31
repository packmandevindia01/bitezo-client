import axiosInstance from "../../../../api/axiosInstance";
import type { HourlySalesReportParams, HourlySalesReportResponse, BranchOption, ApiResponse } from "../types";

export const getHourlySalesReport = async (
  params: HourlySalesReportParams
): Promise<HourlySalesReportResponse["data"]> => {
  const response = await axiosInstance.get<HourlySalesReportResponse>("/reports/hourly-sales-report", { params });
  return response.data.data;
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<ApiResponse<BranchOption[]>>("/Branch/true/list-name");
  return response.data.data;
};
