import { unwrapResponse as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type {
  CategoryWiseSalesReportParams,
  CategoryWiseSalesReportResponse,
  BranchOption,
  CategoryOption,
} from "../types";
import { assertReportSuccess } from "../../framework/reportResponse";


export const getCategoryWiseSalesReport = async (
  params: CategoryWiseSalesReportParams
): Promise<CategoryWiseSalesReportResponse["data"]> => {
  const response = await axiosInstance.get("/reports/category-wise-sales-report", {
    params,
  });
  assertReportSuccess(response.data);
  return unwrap(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};

export const getCategoryList = async (): Promise<CategoryOption[]> => {
  const response = await axiosInstance.get("/category/category-list", {
    params: {
      catCode: "",
      catName: "",
    },
  });
  return unwrap(response);
};
