import axiosInstance from "../../../../api/axiosInstance";
import type {
  ProductWiseStockTransferParams,
  ProductWiseStockTransferRow,
  BranchOption,
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

export const getProductWiseStockTransferReport = async (
  params: ProductWiseStockTransferParams
): Promise<ProductWiseStockTransferRow[]> => {
  const response = await axiosInstance.get<ApiResponse<ProductWiseStockTransferRow[]>>(
    "/reports/product-wise-stock-transfer",
    { params }
  );
  return unwrap<ProductWiseStockTransferRow[]>(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<BranchOption[]>("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getProductList = async (): Promise<ProductOption[]> => {
  const response = await axiosInstance.get<ProductOption[]>("/product/list-name", {
    params: { productName: "" },
  });
  return unwrap<ProductOption[]>(response);
};
