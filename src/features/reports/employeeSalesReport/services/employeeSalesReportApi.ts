import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse, EmployeeSalesData, EmployeeSalesReportParams, BranchOption } from "../types";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;
    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.field || firstError.message) : firstError) 
                  ?? envelope.message 
                  ?? "An unexpected error occurred.";
      throw new Error(msg);
    }
    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as ApiResponse<any>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.field || firstError.message) : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
    throw error;
  }
}

export const getEmployeeSalesReport = async (
  params: EmployeeSalesReportParams
): Promise<EmployeeSalesData[]> => {
  return unwrap(
    axiosInstance.get<ApiResponse<EmployeeSalesData[]>>("/reports/employee-sales-report", {
      params,
    })
  );
};

interface BranchListItem {
  branchId: number;
  branchName: string;
  isActive: string;
  sNo?: number;
}

export const getBranchList = async (): Promise<BranchOption[]> => {
  const data = await unwrap(
    axiosInstance.get<ApiResponse<BranchListItem[]>>("/Branch/list")
  );
  return ((data as any[]) ?? []).map((b: any) => ({
    branchId: Number(b.branchId),
    branchName: b.branchName,
  }));
};
