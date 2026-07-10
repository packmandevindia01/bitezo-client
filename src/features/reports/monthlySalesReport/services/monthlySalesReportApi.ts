import axiosInstance from "../../../../api/axiosInstance";
import type { MonthlySalesReportParams, MonthlySalesReportResponse } from "../types";

export const getMonthlySalesReport = async (
  params: MonthlySalesReportParams
): Promise<MonthlySalesReportResponse["data"]> => {
  const response = await axiosInstance.get<MonthlySalesReportResponse>("/api/reports/monthly-sales-report", { params });
  return response.data.data;
};
