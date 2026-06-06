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
  orderTypeId: number;
  androidStatus: boolean;
  orderId: number;
  voucherDate: string;
  discAmount: number;
  discPer: number;
  serviceCharge: number;
  levy: number;
  vatExclAmount: number;
  vatAmount: number;
  netAmount: number;
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
  combinedOrderIds?: number[];
  modifiers?: any[];
  voidProducts?: any[];
  voidModifiers?: any[];
  createdAt: string;
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
  }[];
  paymodes: {
    paymodeId: number;
    amount: number;
  }[];
}

export const salesInvoiceApi = {
  createSalesInvoice: async (payload: SalesInvoicePayload): Promise<number | null> => {
    try {
      const data = await unwrap<{ id: number }>(axiosInstance.post<ApiResponse<{ id: number }>>('/sales-invoices', payload));
      return data?.id ?? null;
    } catch (e: any) {
      console.error("Sales invoice creation failed:", e);
      throw e;
    }
  }
};
