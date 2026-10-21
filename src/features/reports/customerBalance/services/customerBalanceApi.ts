import axiosInstance from "../../../../api/axiosInstance";
import type { CustomerBalanceParams, CustomerBalanceResponse } from "../types";

export const fetchCustomerBalance = async (
  params: CustomerBalanceParams
): Promise<CustomerBalanceResponse> => {
  const queryParams: Record<string, any> = {
    BranchId: params.BranchId,
    FromDate: params.FromDate,
    ToDate: params.ToDate,
    Decimals: params.Decimals,
  };

  const custId = params.Customerid ?? params.CustomerId;
  if (custId !== undefined && custId !== null && Number(custId) > 0) {
    queryParams.Customerid = Number(custId);
  }

  const response = await axiosInstance.get<CustomerBalanceResponse>(
    "/reports/customer-balance",
    { params: queryParams }
  );
  return response.data;
};
