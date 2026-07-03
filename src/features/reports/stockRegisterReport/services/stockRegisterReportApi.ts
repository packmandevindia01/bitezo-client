import axiosInstance from "../../../../api/axiosInstance";
import type { 
  StockRegisterReportParams, 
  StockRegisterResponse,
  BranchOption,
  GroupOption,
  CategoryOption,
  SubCategoryOption,
  ProductTypeOption,
  ProductOption
} from "../types";

export const getStockRegisterReport = async (params: StockRegisterReportParams): Promise<StockRegisterResponse> => {
  const response = await axiosInstance.get("/reports/stock-register-report", { params });
  return response.data.data;
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return response.data.data;
};

export const getGroupList = async (): Promise<GroupOption[]> => {
  const response = await axiosInstance.get("/group/listname");
  return response.data.data;
};

export const getCategoryList = async (): Promise<CategoryOption[]> => {
  const response = await axiosInstance.get("/category/listname");
  return response.data.data;
};

export const getSubCategoryList = async (categoryId: number): Promise<SubCategoryOption[]> => {
  if (!categoryId || categoryId === 0) return [];
  const response = await axiosInstance.get(`/subcategory/${categoryId}/listname`);
  return response.data.data;
};

export const getProductTypeList = async (): Promise<ProductTypeOption[]> => {
  const response = await axiosInstance.get("/product/list-product-type-name");
  return response.data.data;
};

export const getProductList = async (): Promise<ProductOption[]> => {
  const response = await axiosInstance.get("/product/list-name");
  return response.data.data;
};
