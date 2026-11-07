import { unwrapResponse as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  BillWiseLevyReportParams,
  BillWiseLevyReportResponse,
  BranchOption,
} from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


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
  assertReportSuccess(response.data);
  return unwrap(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};
