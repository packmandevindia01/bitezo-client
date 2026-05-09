import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { DineInSection, DineInTable } from "../types";

export const dineInApi = {
  getSections: async () => {
    const { data } = await axiosInstance.get<ApiResponse<DineInSection[]>>("/menu/dine-in/section-list");
    return data;
  },

  getTables: async (sectionId: number) => {
    const { data } = await axiosInstance.get<ApiResponse<DineInTable[]>>(`/menu/dine-in/table-list/${sectionId}`);
    return data;
  }
};
