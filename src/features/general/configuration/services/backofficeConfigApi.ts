import axiosInstance from "../../../../api/axiosInstance";
import type { BackofficeConfigState } from "../types";

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export const backofficeConfigApi = {
  getBranches: async () => {
    const response = await axiosInstance.get<{
      data: BranchOption[];
      isSuccess: boolean;
      message: string;
    }>("/backoffice-config/config-details");

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load branches");
    }

    return response.data.data;
  },

  getConfigData: async (branchId: number) => {
    const response = await axiosInstance.get<{
      data: any[];
      isSuccess: boolean;
      message: string;
    }>(`/backoffice-config/${branchId}/config-data`);

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load config data");
    }

    return response.data.data;
  },

  updateConfig: async (branchId: number, payload: BackofficeConfigState) => {
    const response = await axiosInstance.put<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/backoffice-config/${branchId}`, payload);

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to save config data");
    }

    return response.data;
  }
};
