import axiosInstance from "../../../../api/axiosInstance";
import type { ProductWiseMarginReportParams, ProductWiseMarginReportResponse } from "../types";

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

export const getProductWiseMarginReport = async (
  params: ProductWiseMarginReportParams
): Promise<ProductWiseMarginReportResponse> => {
  const response = await axiosInstance.get("/reports/product-wise-margin-report", {
    params,
  });
  return unwrap(response);
};

export const getBranchList = async () => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};

export const getProductList = async (branchId?: number) => {
  const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
  const activeBranchId = isBackofficeMode
    ? Number(sessionStorage.getItem("backoffice_activeBranchId")) || null
    : Number(localStorage.getItem("activeBranchId")) || null;

  const finalBranchId = branchId ?? (activeBranchId || undefined);

  const response = await axiosInstance.get("/product/product-list", {
    params: {
      productCode: "",
      productName: "",
      categoryId: 0,
      groupId: 0,
      ...(finalBranchId ? { branchId: finalBranchId } : {}),
    }
  });
  return unwrap(response);
};

export const getGroupList = async () => {
  const response = await axiosInstance.get("/group/group-list", {
    params: {
      groupCode: "",
      groupName: "",
    }
  });
  return unwrap(response);
};

export const getCategoryList = async () => {
  const response = await axiosInstance.get("/category/category-list", {
    params: {
      catCode: "",
      catName: "",
    }
  });
  return unwrap(response);
};

export const getSubCategoryList = async () => {
  const response = await axiosInstance.get("/subcategory/subcategory-list", {
    params: {
      Code: "",
      Name: "",
      catId: 0,
    }
  });
  return unwrap(response);
};
