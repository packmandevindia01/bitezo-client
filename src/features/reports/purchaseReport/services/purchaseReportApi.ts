import { unwrapResponse as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  PurchaseReportParams,
  PurchaseReportResponse,
  BranchOption,
  PaymodeOption,
  SupplierOption,
} from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
  errors?: any[];
}


export const getPurchaseReport = async (params: PurchaseReportParams) => {
  const response = await axiosInstance.get<PurchaseReportResponse>("/reports/purchase-report", {
    params,
  });
  assertReportSuccess(response.data);
  return unwrap<PurchaseReportResponse>(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getPaymodeList = async () => {
  const response = await axiosInstance.get<PaymodeOption[]>("/paymode/list-name");
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
      voucherType: "Purchase",
    },
  });
  return unwrap<any>(response);
};
