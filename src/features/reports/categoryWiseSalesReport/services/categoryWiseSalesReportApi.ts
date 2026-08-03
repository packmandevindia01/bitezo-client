import axiosInstance from "../../../../api/axiosInstance";
import type {
  CategoryWiseSalesReportParams,
  CategoryWiseSalesReportResponse,
  BranchOption,
  CategoryOption,
  ApiResponse,
} from "../types";

function unwrap<T>(response: { data: ApiResponse<T> } | any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

export const getCategoryWiseSalesReport = async (
  params: CategoryWiseSalesReportParams
): Promise<CategoryWiseSalesReportResponse["data"]> => {
  const response = await axiosInstance.get("/reports/category-wise-sales-report", {
    params,
  });
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
