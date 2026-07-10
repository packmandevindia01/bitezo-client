import axiosInstance from "../../../../api/axiosInstance";
import type { BillWiseMarginReportParams, BillWiseMarginReportResponse } from "../types";
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

export const getBillWiseMarginReport = async (
  params: BillWiseMarginReportParams
): Promise<BillWiseMarginReportResponse> => {
  const response = await axiosInstance.get("/reports/bill-wise-margin-report", {
    params,
  });
  return unwrap(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};

export const getCustomerList = async () => {
  const response = await axiosInstance.get("/customer/list-name", {
    params: {
      customerCode: "",
      customerName: "",
    },
  });
  return unwrap(response);
};

export const getSeriesList = async (branchId: string) => {
  const response = await axiosInstance.get("/voucherseries/list-name", {
    params: { 
      branchId: Number(branchId), 
      voucherType: "Sales" 
    },
  });
  return unwrap(response);
};
