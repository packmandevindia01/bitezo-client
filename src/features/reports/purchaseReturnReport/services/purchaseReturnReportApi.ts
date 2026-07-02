import axiosInstance from "../../../../api/axiosInstance";
import type {
  PurchaseReturnReportParams,
  PurchaseReturnReportResponse,
  BranchOption,
  PaymodeOption,
  SupplierOption,
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

export const getPurchaseReturnReport = async (params: PurchaseReturnReportParams) => {
  const response = await axiosInstance.get<PurchaseReturnReportResponse>("/reports/purchase-return-report", {
    params,
  });
  return unwrap<PurchaseReturnReportResponse>(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getPaymodeList = async () => {
  const response = await axiosInstance.get<PaymodeOption[]>("/paymode/paymode-list");
  return unwrap<PaymodeOption[]>(response);
};

export const getSupplierList = async () => {
  const response = await axiosInstance.get<SupplierOption[]>("/supplier/list-name", {
    params: {
      supplierCode: "",
      supplierName: "",
    },
  });
  return unwrap<any>(response);
};

export const getSeriesList = async (branchId: number) => {
  const response = await axiosInstance.get("/voucherseries/list-name", {
    params: {
      branchId,
      voucherType: "Purchase Return",
    },
  });
  return unwrap<any>(response);
};
