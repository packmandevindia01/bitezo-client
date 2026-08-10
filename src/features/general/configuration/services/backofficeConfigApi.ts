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
    try {
      console.log(`[backofficeConfigApi] Sending PUT /backoffice-config/${branchId}:`, JSON.stringify(payload, null, 2));
      const response = await axiosInstance.put<{
        data: any;
        isSuccess: boolean;
        message: string;
      }>(`/backoffice-config/${branchId}`, payload);

      if (!response.data.isSuccess) {
        throw new Error(response.data.message || "Failed to save config data");
      }

      return response.data;
    } catch (err: any) {
      if (err.response) {
        console.error("================ BACKOFFICE CONFIG 500 ERROR ================");
        console.error("HTTP Status:", err.response.status);
        console.error("Error Body:", JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }
};
