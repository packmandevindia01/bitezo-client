import axiosInstance from "../../../../api/axiosInstance";
import type {
  GroupWiseSalesReportParams,
  GroupWiseSalesReportResponse,
  BranchOption,
  GroupOption,
  ApiResponse,
} from "../types";

function unwrap<T>(response: { data: ApiResponse<T> } | any): T {
  if (response.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response.data;
}

export const getGroupWiseSalesReport = async (
  params: GroupWiseSalesReportParams
): Promise<GroupWiseSalesReportResponse["data"]> => {
  const response = await axiosInstance.get("/reports/group-wise-sales-report", {
    params,
  });
  return unwrap(response);
};

export const getBranchList = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get("/Branch/true/list-name");
  return unwrap(response);
};

export const getGroupList = async (): Promise<GroupOption[]> => {
  const response = await axiosInstance.get("/group/group-list", {
    params: {
      groupCode: "",
      groupName: "",
    },
  });
  return unwrap(response);
};
