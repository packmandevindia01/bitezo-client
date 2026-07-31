import axiosInstance from "../../../../api/axiosInstance";
import type { OrderTypeSalesReportParams, OrderTypeSalesReportResponse, BranchOption, ApiResponse } from "../types";

export const getOrderTypeSalesReport = async (
  params: OrderTypeSalesReportParams
): Promise<OrderTypeSalesReportResponse> => {
  const response = await axiosInstance.get<OrderTypeSalesReportResponse>(
    "/reports/order-type-sales-report",
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
