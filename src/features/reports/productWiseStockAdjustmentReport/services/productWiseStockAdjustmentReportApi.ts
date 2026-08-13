import axiosInstance from "../../../../api/axiosInstance";
import type {
  ProductWiseStockAdjustmentParams,
  ProductWiseStockAdjustmentRow,
  BranchOption,
  ProductOption,
  AdjustmentTypeOption,
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

export const getProductWiseStockAdjustmentReport = async (
  params: ProductWiseStockAdjustmentParams
): Promise<ProductWiseStockAdjustmentRow[]> => {
  const response = await axiosInstance.get<ApiResponse<ProductWiseStockAdjustmentRow[]>>(
    "/reports/product-wise-stock-adjustment",
    { params }
  );
  return unwrap<ProductWiseStockAdjustmentRow[]>(response);
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

export const getAdjustmentTypeList = async (): Promise<AdjustmentTypeOption[]> => {
  const response = await axiosInstance.get<ApiResponse<AdjustmentTypeOption[]>>(
    "/stock-adjustment-type/list-name"
  );
  return unwrap<AdjustmentTypeOption[]>(response);
};
