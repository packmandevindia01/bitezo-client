import axiosInstance from "../../../../api/axiosInstance";
import type { StockAdjustmentReportItem, BranchOption, EmployeeOption } from "../types";

export const getStockAdjustmentReport = async (filters: {
  branchId: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
}): Promise<StockAdjustmentReportItem[]> => {
  const params: Record<string, any> = {
    FromDate: filters.fromDate,
    ToDate: filters.toDate,
    Decimals: parseInt(localStorage.getItem("decimalPart") || "3", 10),
  };

  if (filters.branchId && filters.branchId !== "0") {
    params.BranchId = Number(filters.branchId);
  }

  if (filters.employeeId && filters.employeeId !== "0") {
    params.EmployeeId = Number(filters.employeeId);
  }

  const response = await axiosInstance.get<{
    data: StockAdjustmentReportItem[];
    isSuccess: boolean;
    message: string;
  }>("/reports/stock-adjustment", { params });

  if (!response.data || !response.data.isSuccess) {
    throw new Error(response.data?.message || "Failed to fetch stock adjustment report");
  }

  return response.data.data || [];
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<{ data: BranchOption[]; isSuccess: boolean }>("/backoffice-config/config-details");
  return response.data?.data || [];
};

export const getEmployeeList = async (branchId?: number): Promise<EmployeeOption[]> => {
  const params: Record<string, any> = {};
  if (branchId && branchId !== 0) {
    params.branchId = branchId;
  }
  const res = await axiosInstance.get("/stock-adjustment/list-employee-name", { params });
  const raw = res.data;
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
};

