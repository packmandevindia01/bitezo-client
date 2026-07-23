import axiosInstance from "../../../../api/axiosInstance";

export interface PurchaseReturnMasterData {
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

export const purchaseReturnApi = {
  loadMasterData: async () => {
    const response = await axiosInstance.get<{
      data: PurchaseReturnMasterData;
      isSuccess: boolean;
      message: string;
      status: number;
    }>("/purchase-return-invoice/load-master");

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load master data");
    }

    return response.data.data;
  },

  getPurchaseReturnNumber: async (seriesId: number) => {
    const response = await axiosInstance.get<{
      data: { purchaseReturnNo: number };
      isSuccess: boolean;
      message: string;
    }>(`/purchase-return-invoice/purchase_return-number/${seriesId}`);

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to load purchase return number");
    }

    return response.data.data;
  },

  getUnits: async (unitCategory: string) => {
    const response = await axiosInstance.get(`/purchase-return-invoice/unit-list-name?unitCategory=${unitCategory}`);
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
    }>("/purchase-return-invoice/product-list-name", {
      params: { branchId, productName }
    });

    if (!response.data.isSuccess) {
      throw new Error(response.data.message || "Failed to search products");
    }

    return response.data.data;
  },

  searchProductsByBarcode: async (barcode: string) => {
    const response = await axiosInstance.get<{
      data: {
        productId: number;
        barcode: string;
      }[];
      isSuccess: boolean;
      message: string;
    }>("/purchase-return-invoice/product-list-barcode", {
      params: { Barcode: barcode }
    });
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  getProductCostData: async (barcode: string) => {
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
    }>(`/purchase-return-invoice/purchase-cost-data/${barcode}`);
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
    }>(`/purchase-return-invoice/${productId}/unit-cost/${unitId}`);
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
      }>("/purchase-return-invoice/supplier-list-name", {
        params: { supplierName: query }
      });
      if (!response.data.isSuccess) throw new Error(response.data.message);
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.message || "Failed to search suppliers");
    }
  },

  savePurchaseReturn: async (payload: any) => {
    const response = await axiosInstance.post<{
      data: { id: number };
      isSuccess: boolean;
      message: string;
    }>("/purchase-return-invoice", payload);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data;
  },

  getPurchaseReturnList: async (params: any) => {
    const response = await axiosInstance.get<{
      data: any[];
      isSuccess: boolean;
      message: string;
    }>("/purchase-return-invoice/details", { params });
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  getPurchaseReturnById: async (purchaseReturnId: string | number) => {
    const response = await axiosInstance.get<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-return-invoice/data/${purchaseReturnId}`);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  updatePurchaseReturn: async (purchaseReturnId: string | number, payload: any) => {
    const response = await axiosInstance.put<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-return-invoice/${purchaseReturnId}`, payload);
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data;
  },

  cancelPurchaseReturn: async (purchaseReturnId: string | number) => {
    const response = await axiosInstance.put<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-return-invoice/cancel/${purchaseReturnId}`);
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
    }>("/purchase-return-invoice/unit-list-name", {
      params: { unitCategory }
    });
    if (!response.data.isSuccess) throw new Error(response.data.message);
    return response.data.data;
  },

  searchPurchaseInvoices: async (branchId: number, supplierId: number, invoiceNo: string = "") => {
    const response = await axiosInstance.get<{
      data: any[];
      isSuccess: boolean;
      message: string;
    }>("/purchase-invoice/list-invoice-no", {
      params: { BranchId: branchId, SupplierId: supplierId, InvoiceNo: invoiceNo }
    });
    if (!response.data.isSuccess) throw new Error(response.data.message || "Failed to fetch invoices");
    return response.data.data || [];
  },

  getPurchaseInvoiceData: async (purchaseId: string | number) => {
    const response = await axiosInstance.get<{
      data: any;
      isSuccess: boolean;
      message: string;
    }>(`/purchase-invoice/data/${purchaseId}`);
    if (!response.data.isSuccess) throw new Error(response.data.message || "Failed to fetch invoice data");
    return response.data.data;
  },
};
