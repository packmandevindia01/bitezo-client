import axiosInstance from "../../../../api/axiosInstance";

export interface PurchaseInvoiceMasterData {
  series: {
    seriesId: number;
    seriesName: string;
    prefix: string;
    startNo: number;
    branchId: number;
  }[];
  branches: {
    branchId: number;
    branchName: string;
  }[];
  salesman: {
    employeeId: number;
    employeeName: string;
  }[];
  vats: {
    vatId: number;
    vatName: string;
    vatValue: number;
  }[];
  paymodes: {
    paymodeId: number;
    paymodeName: string;
  }[];
  units?: {
    label: string;
    value: string;
  }[];
}

export const purchaseInvoiceApi = {
  loadMasterData: async () => {
    const response = await axiosInstance.get<{
      data: PurchaseInvoiceMasterData;
      isSuccess: boolean;
      message: string;
      status: number;
    }>("/purchase-invoice/load-master");

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load master data");
    }

    return response.data.data;
  },

  getPurchaseNumber: async (seriesId: number) => {
    const response = await axiosInstance.get<{
      data: { purchaseNo: number };
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/purchase-number/${seriesId}`);

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load purchase number");
    }

    return response.data.data;
  },

  getUnits: async (unitCategory: string) => {
    const response = await axiosInstance.get(`/purchase-invoice/unit-list-name?unitCategory=${unitCategory}`);
    return response.data.data;
  },

  searchProductsByName: async (branchId: number, productName: string) => {
    const response = await axiosInstance.get<{
      data: {
        productId: number;
        productName: string;
        code: string;
        barcode: string;
      }[];
      isSuccess: boolean;
      message: string;
    }>("/purchase-invoice/product-list-name", {
      params: { branchId, productName }
    });

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to search products");
    }

    return response.data.data;
  },

  searchProductsByBarcode: async (branchId: number, barcode: string) => {
    const response = await axiosInstance.get<{
      data: {
        productId: number;
        barcode: string;
      }[];
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/${branchId}/product-list-barcode`, {
      params: { Barcode: barcode }
    });
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  getProductCostData: async (branchId: number, barcode: string) => {
    const response = await axiosInstance.get<{
      data: {
        productId: number;
        productCode: string;
        productName: string;
        baseUnitId: number;
        cost: number;
        altUnitId: number;
        vatId: number;
        vatName: string;
        vatValue: number;
        unitCategory: string;
      };
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/${branchId}/purchase-cost-data/${barcode}`);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  getProductCostDataById: async (productId: number) => {
    const response = await axiosInstance.get<{
      data: {
        productId: number;
        productCode: string;
        productName: string;
        baseUnitId: number;
        cost: number;
        altUnitId: number;
        vatId: number;
        vatName: string;
        vatValue: number;
        unitCategory: string;
      };
      isSuccess: boolean;
      message: string;
    }>(`/product/${productId}/productid-data`);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  getUnitCost: async (productId: number, unitId: number) => {
    const response = await axiosInstance.get<{
      data: { cost: number };
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/${productId}/unit-cost/${unitId}`);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  searchSuppliers: async (query: string) => {
    try {
      const response = await axiosInstance.get<{
        data: {
          supplierId: number;
          code: string;
          supplierName: string;
        }[];
        isSuccess: boolean;
        message: string;
      }>("/purchase-invoice/supplier-list-name", {
        params: { supplierName: query }
      });
      if (!response.data.isSuccess) throw new Error(response.data.message);
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.message || "Failed to search suppliers");
    }
  },

  savePurchaseInvoice: async (payload: any) => {
    const response = await axiosInstance.post<{
      data: { id: number };
      isSuccess: boolean;
      message: string;
    }>("/purchase-invoice", payload);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data;
  },

  getPurchaseInvoiceList: async (params: any) => {
    const response = await axiosInstance.get<{
      data: any[];
      isSuccess: boolean;
      message: string;
    }>("/purchase-invoice/details", { params });
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  getPurchaseInvoiceById: async (purchaseId: string | number) => {
    const response = await axiosInstance.get<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/data/${purchaseId}`);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  updatePurchaseInvoice: async (purchaseId: string | number, payload: any) => {
    const response = await axiosInstance.put<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/${purchaseId}`, payload);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data;
  },

  cancelPurchaseInvoice: async (purchaseId: string | number) => {
    const response = await axiosInstance.put<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/cancel/${purchaseId}`);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data;
  },

  getUnitsByCategory: async (unitCategory: string) => {
    const response = await axiosInstance.get<{
      data: {
        unitId: number;
        name: string;
        currentValue: number;
      }[];
      isSuccess: boolean;
      message: string;
    }>("/purchase-invoice/unit-list-name", {
      params: { unitCategory }
    });
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },
};
