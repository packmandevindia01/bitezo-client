import axiosInstance from "../../../api/axiosInstance";
import type { ApiResponse } from "../../inventory/product/types";
import type { 
  GeneralPrinterSettings, 
  CategoryPrinterSetting, 
  ProductPrinterSetting, 
  SectionPrinterSetting, 
  OrderTypePrinterSetting,
  PrinterIpMapItem
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
  // Unified endpoint with fallback to individual endpoints if server returns 404
  getPrinterData: async () => {
    try {
      const { data } = await axiosInstance.get<ApiResponse<any>>("/pos-printer-settings/printer-data", getTerminalHeaders());
      return data;
    } catch (e: any) {
      // Fallback: If unified /printer-data endpoint returns 404 or fails, query individual endpoints
      try {
        const [generalRes, categoryRes, productRes, sectionRes, orderTypeRes] = await Promise.allSettled([
          axiosInstance.get("/pos-printer-settings/general", getTerminalHeaders()),
          axiosInstance.get("/pos-printer-settings/category", getTerminalHeaders()),
          axiosInstance.get("/pos-printer-settings/product", getTerminalHeaders()),
          axiosInstance.get("/pos-printer-settings/section", getTerminalHeaders()),
          axiosInstance.get("/pos-printer-settings/order-type", getTerminalHeaders())
        ]);

        const generalData = generalRes.status === "fulfilled" ? generalRes.value.data?.data : null;
        const categoryData = categoryRes.status === "fulfilled" ? categoryRes.value.data?.data : [];
        const productData = productRes.status === "fulfilled" ? productRes.value.data?.data : [];
        const sectionData = sectionRes.status === "fulfilled" ? sectionRes.value.data?.data : [];
        const orderTypeData = orderTypeRes.status === "fulfilled" ? orderTypeRes.value.data?.data : [];

        return {
          isSuccess: true,
          data: {
            generalPrinter: generalData,
            categoryPrinter: categoryData,
            productPrinter: productData,
            sectionPrinter: sectionData,
            ordertypePrinter: orderTypeData
          }
        };
      } catch (fallbackErr) {
        throw e;
      }
    }
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
  },

  // Printer IP Map
  getPrinterIpMap: async () => {
    const { data } = await axiosInstance.get<ApiResponse<PrinterIpMapItem[]>>("/pos-printer-settings/printer-ip-map", getTerminalHeaders());
    return data;
  },
  savePrinterIpMap: async (items: PrinterIpMapItem[] | { printerName: string; ipAddress: string }) => {
    const list = Array.isArray(items) ? items : [items];
    const payload = {
      printerIps: list.map(item => ({
        ipAddress: item.ipAddress.trim(),
        printerName: item.printerName.trim()
      }))
    };
    const { data } = await axiosInstance.post<ApiResponse<any>>("/pos-printer-settings/printer-ip-map", payload, getTerminalHeaders());
    return data;
  }
};
