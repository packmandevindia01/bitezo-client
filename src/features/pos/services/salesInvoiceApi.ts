import axiosInstance from "../../../api/axiosInstance";

export interface ApiResponse<T = any> {
  isSuccess: boolean;
  message: string | null;
  data: T;
  errors?: Record<string, string[]>;
}

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (!res.data.isSuccess) {
      throw new Error(res.data.message || "An unexpected error occurred");
    }
    return res.data.data;
  });

export interface SalesInvoicePayload {
  seriesId: number;
  prefix: string;
  customerId: number;
  paymodeId: number;
  employeeId: number;
  dayId: number;
  shiftId: number;
  transDate: string;
  orderTypeId: number;
  androidStatus: boolean;
  saleId?: number;
  orderId: number;
  voucherDate: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
  deliveryCharge?: number;
  orderMaster: {
    isOrderEdited?: boolean;
    sectionId?: number;
    tableId?: number;
    guestNo?: number;
    vehicleCustomerName?: string;
    vehicleNo?: string;
    addressId?: number;
    missedCall?: boolean;
    contactNo?: string;
    note?: string;
    change?: string;
    isComing?: boolean;
    comingTime?: string;
    providerNo?: string;
    driverId?: number;
    transDate?: string;
  };
  combinedOrderIds?: number[];
  modifiers?: any[];
  voidProducts?: any[];
  voidModifiers?: any[];
  createdAt?: string;
  updateAt?: string;
  details: {
    productId: number;
    unitId: number;
    vatId: number;
    qty: number;
    price: number;
    discPer: number;
    discAmount: number;
    serviceCharge: number;
    levy: number;
    vatAmount: number;
    netAmount: number;
    baseQty: number;
    mapId: number;
    complimentaryStatus: boolean;
  }[];
  paymodes: {
    paymodeId: number;
    amount: number;
  }[];
}

export const salesInvoiceApi = {
  createSalesInvoice: async (payload: SalesInvoicePayload): Promise<any> => {
    try {
      const postPayload: any = { ...payload };
      delete postPayload.saleId;
      delete postPayload.updateAt;
      delete postPayload.updatedAt;

      // Ensure voucherDate is strictly Date-Only (YYYY-MM-DD)
      if (postPayload.voucherDate) {
        postPayload.voucherDate = postPayload.voucherDate.includes("T")
          ? postPayload.voucherDate.split("T")[0]
          : postPayload.voucherDate;
      } else {
        postPayload.voucherDate = new Date().toISOString().split("T")[0];
      }

      if (!postPayload.createdAt) {
        postPayload.createdAt = new Date().toISOString();
      }
      if (!postPayload.transDate || postPayload.transDate.includes("T00:00:00") || !postPayload.transDate.includes("T")) {
        const now = new Date();
        const datePart = (postPayload.transDate || "").split("T")[0];
        if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [year, month, day] = datePart.split("-").map(Number);
          const combined = new Date();
          combined.setFullYear(year, month - 1, day);
          postPayload.transDate = combined.toISOString();
        } else {
          postPayload.transDate = now.toISOString();
        }
      }

      const data = await unwrap<any>(axiosInstance.post<ApiResponse<any>>('/sales-invoices', postPayload));
      return data ?? null;
    } catch (e: any) {
      console.error("Sales invoice creation failed:", e);
      throw e;
    }
  },
  
  updateSalesInvoice: async (saleId: number, payload: SalesInvoicePayload): Promise<boolean> => {
    try {
      const putPayload: any = { ...payload };
      putPayload.saleId = saleId;
      putPayload.updateAt = new Date().toISOString();

      // Ensure voucherDate is strictly Date-Only (YYYY-MM-DD)
      if (putPayload.voucherDate) {
        putPayload.voucherDate = putPayload.voucherDate.includes("T")
          ? putPayload.voucherDate.split("T")[0]
          : putPayload.voucherDate;
      } else {
        putPayload.voucherDate = new Date().toISOString().split("T")[0];
      }

      // Remove fields not present in PUT UpdateSalesInvoiceDto
      delete putPayload.seriesId;
      delete putPayload.prefix;
      delete putPayload.dayId;
      delete putPayload.shiftId;
      delete putPayload.transDate;
      delete putPayload.androidStatus;
      delete putPayload.createdAt;
      delete putPayload.updatedAt;
      delete putPayload.combinedOrderIds;

      await unwrap<any>(axiosInstance.put<ApiResponse<any>>(`/sales-invoices/${saleId}`, putPayload));
      return true;
    } catch (e: any) {
      console.error("Sales invoice update failed:", e);
      throw e;
    }
  },

  getSalesInvoiceData: async (saleId: number, orderId: number): Promise<any> => {
    try {
      const data = await unwrap<any>(axiosInstance.get<ApiResponse<any>>(`/sales-invoices/sales-data/${saleId}/order/${orderId}`));
      return data;
    } catch (e: any) {
      console.error("Failed to fetch sales invoice data:", e);
      throw e;
    }
  }
};
