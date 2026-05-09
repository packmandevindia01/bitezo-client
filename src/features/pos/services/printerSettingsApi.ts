import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { 
  GeneralPrinterSettings, 
  CategoryPrinterSetting, 
  ProductPrinterSetting, 
  SectionPrinterSetting, 
  OrderTypePrinterSetting 
} from "../types";

export const printerSettingsApi = {
  // General
  getGeneral: async () => {
    const { data } = await axiosInstance.get<ApiResponse<GeneralPrinterSettings>>("/pos-printer-settings/general");
    return data;
  },
  updateGeneral: async (settings: GeneralPrinterSettings) => {
    const { data } = await axiosInstance.put<ApiResponse<any>>("/pos-printer-settings/general", settings);
    return data;
  },

  // Category
  getCategories: async () => {
    const { data } = await axiosInstance.get<ApiResponse<CategoryPrinterSetting[]>>("/pos-printer-settings/category");
    return data;
  },
  saveCategories: async (categoryPrinters: CategoryPrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/category", { categoryPrinters });
    return data;
  },

  // Product
  getProducts: async () => {
    const { data } = await axiosInstance.get<ApiResponse<ProductPrinterSetting[]>>("/pos-printer-settings/product");
    return data;
  },
  saveProducts: async (productPrinters: ProductPrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/product", { productPrinters });
    return data;
  },

  // Section
  getSections: async () => {
    const { data } = await axiosInstance.get<ApiResponse<SectionPrinterSetting[]>>("/pos-printer-settings/section");
    return data;
  },
  saveSections: async (sectionPrinters: SectionPrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/section", { sectionPrinters });
    return data;
  },

  // Order Type
  getOrderTypes: async () => {
    const { data } = await axiosInstance.get<ApiResponse<OrderTypePrinterSetting[]>>("/pos-printer-settings/order-type");
    return data;
  },
  saveOrderTypes: async (orderTypePrinters: OrderTypePrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/order-type", { orderTypePrinters });
    return data;
  }
};
