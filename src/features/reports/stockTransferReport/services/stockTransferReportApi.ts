import axiosInstance from "../../../../api/axiosInstance";
import type {
  StockTransferReportParams,
  StockTransferReportRow,
  BranchOption,
  EmployeeOption,
} from "../types";

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
  errors?: any[];
}

function unwrap<T>(response: { data: ApiResponse<T> } | any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

export const getStockTransferReport = async (
  params: StockTransferReportParams
): Promise<StockTransferReportRow[]> => {
  const response = await axiosInstance.get<ApiResponse<StockTransferReportRow[]>>(
    "/reports/stock-transfer",
    { params }
  );
  return unwrap<StockTransferReportRow[]>(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getEmployeeList = async (branchId: number): Promise<EmployeeOption[]> => {
  const response = await axiosInstance.get(
    `/stock-transfer/list-employee-name?branchId=${branchId}`
  );
  // endpoint returns { data: [...], isSuccess: true } or direct array
  const raw = response.data;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw)) return raw;
  return [];
};
