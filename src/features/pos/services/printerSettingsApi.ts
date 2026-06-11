import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { 
  GeneralPrinterSettings, 
  CategoryPrinterSetting, 
  ProductPrinterSetting, 
  SectionPrinterSetting, 
  OrderTypePrinterSetting 
} from "../types";

const getTerminalHeaders = () => {
  // Fallback to systemCounterId or terminalId
  const terminalId = localStorage.getItem("terminalId") || localStorage.getItem("systemCounterId") || "0";
  return {
    headers: {
      terminalId
    }
  };
};

export const printerSettingsApi = {
  // Unified endpoint
  getPrinterData: async () => {
    const { data } = await axiosInstance.get<ApiResponse<any>>("/pos-printer-settings/printer-data", getTerminalHeaders());
    return data;
  },

  // General
  getGeneral: async () => {
    const { data } = await axiosInstance.get<ApiResponse<GeneralPrinterSettings>>("/pos-printer-settings/general", getTerminalHeaders());
    return data;
  },
  updateGeneral: async (settings: GeneralPrinterSettings) => {
    const { data } = await axiosInstance.put<ApiResponse<any>>("/pos-printer-settings/general", settings, getTerminalHeaders());
    return data;
  },

  // Category
  getCategories: async () => {
    const { data } = await axiosInstance.get<ApiResponse<CategoryPrinterSetting[]>>("/pos-printer-settings/category", getTerminalHeaders());
    return data;
  },
  saveCategories: async (categoryPrinters: CategoryPrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/category", { categoryPrinters }, getTerminalHeaders());
    return data;
  },

  // Product
  getProducts: async () => {
    const { data } = await axiosInstance.get<ApiResponse<ProductPrinterSetting[]>>("/pos-printer-settings/product", getTerminalHeaders());
    return data;
  },
  saveProducts: async (productPrinters: ProductPrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/product", { productPrinters }, getTerminalHeaders());
    return data;
  },

  // Section
  getSections: async () => {
    const { data } = await axiosInstance.get<ApiResponse<SectionPrinterSetting[]>>("/pos-printer-settings/section", getTerminalHeaders());
    return data;
  },
  saveSections: async (sectionPrinters: SectionPrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/section", { sectionPrinters }, getTerminalHeaders());
    return data;
  },

  // Order Type
  getOrderTypes: async () => {
    const { data } = await axiosInstance.get<ApiResponse<OrderTypePrinterSetting[]>>("/pos-printer-settings/order-type", getTerminalHeaders());
    return data;
  },
  saveOrderTypes: async (orderTypePrinters: OrderTypePrinterSetting[]) => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/order-type", { orderTypePrinters }, getTerminalHeaders());
    return data;
  }
};
