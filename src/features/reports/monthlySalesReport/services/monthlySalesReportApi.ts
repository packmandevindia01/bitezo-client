import axiosInstance from "../../../../api/axiosInstance";
import type { MonthlySalesReportParams, MonthlySalesReportResponse } from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";

export const getMonthlySalesReport = async (
  params: MonthlySalesReportParams
): Promise<MonthlySalesReportResponse["data"]> => {
  const response = await axiosInstance.get<MonthlySalesReportResponse>("/reports/monthly-sales-report", { params });
  assertReportSuccess(response.data);
  return response.data.data;
};
