import axiosInstance from "../../../../api/axiosInstance";
import type {
  ProductTransactionLogParams,
  ProductTransactionLogResponse,
  BranchOption,
  ProductOption,
} from "../types";

function unwrap<T>(response: any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

export const getProductTransactionLogReport = async (
  params: ProductTransactionLogParams
): Promise<ProductTransactionLogResponse> => {
  const response = await axiosInstance.get("/reports/product-transaction-log", { params });
  return unwrap<ProductTransactionLogResponse>(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap<BranchOption[]>(response);
};

export const getProductList = async (): Promise<ProductOption[]> => {
  const response = await axiosInstance.get("/product/list-name");
  return unwrap<ProductOption[]>(response);
};
