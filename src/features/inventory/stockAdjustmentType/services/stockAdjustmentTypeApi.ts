import axiosInstance from "../../../../api/axiosInstance";
import type { StockAdjustmentType, StockAdjustmentTypePayload } from "../types";

interface ApiResponse<T> {
  data: T;
  isSuccess: boolean;
  message: string;
}

export const stockAdjustmentTypeApi = {
  getAll: async () => {
    const response = await axiosInstance.get<ApiResponse<StockAdjustmentType[]>>(
      "/stock-adjustment-type/details"
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load stock adjustment types");
    }
    return response.data.data;
  },

  getById: async (typeId: number) => {
    const response = await axiosInstance.get<ApiResponse<StockAdjustmentType>>(
      `/stock-adjustment-type/${typeId}/typeid-data`
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load stock adjustment type");
    }
    return response.data.data;
  },

  create: async (payload: StockAdjustmentTypePayload) => {
    const response = await axiosInstance.post<ApiResponse<any>>(
      "/stock-adjustment-type",
      {
        ...payload,
        createdAt: new Date().toISOString()
      }
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to create stock adjustment type");
    }
    return response.data;
  },

  update: async (typeId: number, payload: StockAdjustmentTypePayload) => {
    const response = await axiosInstance.put<ApiResponse<any>>(
      `/stock-adjustment-type/${typeId}`,
      {
        ...payload,
        typeId,
        id: typeId,
        adjustmentTypeId: typeId,
        updatedAt: new Date().toISOString()
      }
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to update stock adjustment type");
    }
    return response.data;
  },

  delete: async (typeId: number) => {
    const response = await axiosInstance.delete<ApiResponse<any>>(
      `/stock-adjustment-type/${typeId}`
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to delete stock adjustment type");
    }
    return response.data;
  },

  getListNames: async () => {
    const response = await axiosInstance.get<ApiResponse<StockAdjustmentType[]>>(
      "/stock-adjustment-type/list-name"
    );
    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load stock adjustment type names");
    }
    return response.data.data;
  }
};
