import { unwrapResponse as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  ProductWiseLevyReportParams,
  ProductWiseLevyReportResponse,
  BranchOption,
} from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


export const getProductWiseLevyReport = async (
  params: ProductWiseLevyReportParams
): Promise<ProductWiseLevyReportResponse["data"]> => {
  const queryParams: Record<string, any> = {
    BranchId: params.BranchId,
    FromDate: params.FromDate,
    ToDate: params.ToDate,
    Decimals: params.Decimals,
  };

  const response = await axiosInstance.get("/reports/product-wise-levy-report", {
    params: queryParams,
  });
  assertReportSuccess(response.data);
  return unwrap(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};
