import { unwrapReport as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse, DayEndReportResponse, DayEndReportParams } from "../types";


export const getDayEndReport = async (
  params: DayEndReportParams
): Promise<DayEndReportResponse> => {
  return unwrap(
    axiosInstance.get<ApiResponse<DayEndReportResponse>>("/reports/day-end-report", {
      params,
    })
  );
};

export const getDayEndCashierLogDetail = async (dayId: number): Promise<any> => {
  try {
    const data = await unwrap(
      axiosInstance.get<ApiResponse<any>>(`/Cashier-log/dayend-report/${dayId}`)
    );
    return data;
  } catch {
    return null;
  }
};

