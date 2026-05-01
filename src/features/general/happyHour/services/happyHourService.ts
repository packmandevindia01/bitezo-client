import axiosInstance from "../../../../api/axiosInstance";
import type { HappyHourPayload, HappyHourListItem, HappyHourData } from "../types";

export interface HappyHourProduct {
  productId: number;
  unitId: number;
  product: string;
  barcode: string;
  altName: string;
  isIncl: boolean;
  originalprice: number;
  discountPer: number;
  discount: number;
  promoPrice: number;
}

export const happyHourService = {
  getHappyHours: async (fromDate: string, toDate: string): Promise<HappyHourListItem[]> => {
    const response = await axiosInstance.get("/happy_hour/happy-hour-list", {
        params: { fromDate, toDate }
    });
    return response.data.data;
  },

  getHappyHourById: async (id: number): Promise<HappyHourData> => {
    const response = await axiosInstance.get(`/happy_hour/${id}/happy_hour-data`);
    return response.data.data;
  },

  saveHappyHour: async (payload: HappyHourPayload) => {
    return axiosInstance.post("/happy_hour", payload);
  },

  updateHappyHour: async (id: number, payload: HappyHourPayload) => {
    return axiosInstance.put(`/happy_hour/${id}`, payload);
  },

  deleteHappyHour: async (id: number) => {
    return axiosInstance.delete(`/happy_hour/${id}`);
  },

  loadHappyHourProducts: async (categoryId?: number, subCategoryId?: number): Promise<HappyHourProduct[]> => {
    const response = await axiosInstance.get("/happy_hour/load_products", {
      params: { categoryId, subCategoryId }
    });
    return response.data.data;
  },
};
