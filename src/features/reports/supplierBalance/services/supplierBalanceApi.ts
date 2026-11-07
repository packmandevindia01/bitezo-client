import axiosInstance from "../../../../api/axiosInstance";
import type { SupplierBalanceParams, SupplierBalanceResponse } from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";

export const fetchSupplierBalance = async (
  params: SupplierBalanceParams
): Promise<SupplierBalanceResponse> => {
  const queryParams: Record<string, any> = {
    BranchId: params.BranchId,
    FromDate: params.FromDate,
    ToDate: params.ToDate,
    Decimals: params.Decimals,
  };

  if (params.SupplierId !== undefined && params.SupplierId !== null && Number(params.SupplierId) > 0) {
    queryParams.SupplierId = Number(params.SupplierId);
  }

  const response = await axiosInstance.get<SupplierBalanceResponse>(
    "/reports/supplier-balance",
    { params: queryParams }
  );
  assertReportSuccess(response.data);
  return response.data;
};
