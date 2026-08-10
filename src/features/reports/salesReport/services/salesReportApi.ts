import axiosInstance from "../../../../api/axiosInstance";

import type {
  SalesReportParams,
  SalesReportResponse,
  BranchOption,
  PaymodeOption,
  CustomerOption,
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

export const getSalesReport = async (params: SalesReportParams) => {
  const response = await axiosInstance.get<SalesReportResponse>("/reports/sales-report", {
    params,
  });
  return unwrap<SalesReportResponse>(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getPaymodeList = async () => {
  const response = await axiosInstance.get<PaymodeOption[]>("/paymode/list-name");
  return unwrap<PaymodeOption[]>(response);
};

export const getCustomerList = async () => {
  // Pass empty strings to get all customers, or we can handle search on client side
  const response = await axiosInstance.get<CustomerOption[]>("/customer/list-name", {
    params: {
      customerCode: "",
      customerName: "",
    },
  });
  return unwrap<any>(response);
};

export const getSeriesList = async (branchId: number) => {
  const response = await axiosInstance.get("/voucherseries/list-name", {
    params: {
      branchId,
      voucherType: "Sales"
    }
  });
  return unwrap<any>(response);
};
