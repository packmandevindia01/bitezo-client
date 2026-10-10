import axiosInstance from "../../../../api/axiosInstance";
import type {
  BillWiseLevyReportParams,
  BillWiseLevyReportResponse,
  BranchOption,
  ApiResponse,
} from "../types";

function unwrap<T>(response: { data: ApiResponse<T> } | any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

export const getBillWiseLevyReport = async (
  params: BillWiseLevyReportParams
): Promise<BillWiseLevyReportResponse["data"]> => {
  const queryParams: Record<string, any> = {
    BranchId: params.BranchId,
    FromDate: params.FromDate,
    ToDate: params.ToDate,
    Decimals: params.Decimals,
  };

  const response = await axiosInstance.get("/reports/bill-wise-levy-report", {
    params: queryParams,
  });
  return unwrap(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};
