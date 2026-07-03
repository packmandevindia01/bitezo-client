import axiosInstance from "../../../../api/axiosInstance";
import type {
  ProductWisePurchaseReportParams,
  ProductWisePurchaseReportResponse,
  BranchOption,
  SupplierOption,
  ProductOption,
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

export const getProductWisePurchaseReport = async (params: ProductWisePurchaseReportParams) => {
  const response = await axiosInstance.get<ProductWisePurchaseReportResponse>("/reports/product-wise-purchase-report", {
    params,
  });
  return unwrap<ProductWisePurchaseReportResponse>(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getSupplierList = async () => {
  const response = await axiosInstance.get<SupplierOption[]>("/supplier/list-name", {
    params: {
      supplierCode: "",
      supplierName: "",
    },
  });
  return unwrap<SupplierOption[]>(response);
};

export const getProductList = async () => {
  const response = await axiosInstance.get<ProductOption[]>("/product/list-name", {
    params: {
      productName: "",
    },
  });
  return unwrap<ProductOption[]>(response);
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
