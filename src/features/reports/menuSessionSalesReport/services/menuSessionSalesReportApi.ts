import axiosInstance from "../../../../api/axiosInstance";
import type { MenuSessionSalesReportParams, MenuSessionSalesReportResponse, BranchOption, ApiResponse } from "../types";

export const getMenuSessionSalesReport = async (
  params: MenuSessionSalesReportParams
): Promise<MenuSessionSalesReportResponse> => {
  const response = await axiosInstance.get<MenuSessionSalesReportResponse>(
    "/reports/menu-session-sales-report",
    { params }
  );
  return response.data;
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<ApiResponse<BranchOption[]>>("/Branch/true/list-name");
  
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  
  return [];
};
