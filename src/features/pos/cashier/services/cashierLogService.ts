import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";

export interface DenominationEntry {
  denominationId: number;
  cashCount: number;
}

export interface OpenDayRequest {
  startDate: string;
  transDate: string;
  openingBal: number;
  denominations: DenominationEntry[];
}

export interface OpenShiftRequest {
  dayId: number;
  startDate: string;
  transDate: string;
  openingBal: number;
  denominations: DenominationEntry[];
}

export interface CloseDayRequest {
  dayId: number;
  shiftId: number;
  closingBal: number;
  endDate: string;
  denominations: DenominationEntry[];
}

export interface CloseShiftRequest {
  dayId: number;
  shiftId: number;
  closingBal: number;
  endDate: string;
  denominations: DenominationEntry[];
}

export interface CashierInStatus {
  isDayClosed: boolean;
  isShiftClosed: boolean;
  dayId: number;
  shiftId: number;
  userId: number;
  transDate: string;
}

export interface CashierStatusResponse {
  cashierInStatus: CashierInStatus;
  accessToken: string;
  refreshToken: string;
  role: string;
  tenantId: string;
  company: {
    decimalPart: number;
    currencySymbol: string;
  };
}

export interface EndReportHeader {
  dayEndHeader1?: string;
  dayEndHeaderLeftAlign1?: number;
  dayEndHeaderFont1?: string;
  dayEndHeader2?: string;
  dayEndHeaderLeftAlign2?: number;
  dayEndHeaderFont2?: string;
  dayEndHeader3?: string;
  dayEndHeaderLeftAlign3?: number;
  dayEndHeaderFont3?: string;
  dayEndHeader4?: string;
  dayEndHeaderLeftAlign4?: number;
  dayEndHeaderFont4?: string;
  dayEndHeader5?: string;
  dayEndHeaderLeftAlign5?: number;
  dayEndHeaderFont5?: string;
  dayEndHeader6?: string;
  dayEndHeaderLeftAlign6?: number;
  dayEndHeaderFont6?: string;
}

export interface EndReportData {
  header: EndReportHeader;
  orderTypes: { orderType: string; count: number; total: number }[];
  waiters: { waiter: string; count: number; total: number }[];
  categories: { categoryName: string; qty: number; total: number }[];
  voidProducts: any[] | null;
  paymodes: { paymodeName: string; amount: number }[];
  taxSummary: { vatName: string; exclAmount: number; vatAmount: number }[];
  salesSummary: { sales: number; vatAmount: number; deliveryCharge: number };
  generalSummary: { startDate: string; endDate: string; voidSales: number; voidOrders: number; pendingOrder: number };
  cashFlow: { openingBal: number; cashSales: number; payIn: number; payOut: number; closingBal: number };
}

export interface DayClosedLog {
  dayId: number;
  startDate: string;
  endDate: string;
  branch: string;
  status: string;
  counter?: string;
}

export interface ShiftClosedLog {
  dayId: number;
  shiftId: number;
  startDate: string;
  endDate: string;
  branch: string;
  counter: string;
  status: string;
}

export const cashierLogService = {
  checkStatus: async (branchId?: number, counterId?: number): Promise<CashierStatusResponse> => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId.toString());
    if (counterId) params.append('counterId', counterId.toString());

    const { data } = await axiosInstance.get<ApiResponse<CashierStatusResponse>>(`/Cashier-log/iscashier-in?${params.toString()}`);
    
    if (data.isSuccess && data.data) {
      return data.data;
    }
    throw new Error(data.message || "Failed to check cashier status");
  },

  openDay: async (payload: OpenDayRequest): Promise<any> => {
    const { data } = await axiosInstance.post<ApiResponse<any>>(`/Cashier-log/open_day`, payload);
    return data;
  },

  openShift: async (payload: OpenShiftRequest): Promise<any> => {
    const { data } = await axiosInstance.post<ApiResponse<any>>(`/Cashier-log/open_shift`, payload);
    return data;
  },

  closeDay: async (payload: CloseDayRequest): Promise<any> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>(`/Cashier-log/close-day`, payload);
    return data;
  },

  closeShift: async (payload: CloseShiftRequest): Promise<any> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>(`/Cashier-log/close-shift`, payload);
    return data;
  },

  getDayEndReport: async (dayId: number): Promise<EndReportData> => {
    const { data } = await axiosInstance.get<ApiResponse<EndReportData>>(`/Cashier-log/dayend-report/${dayId}`);
    if (data.isSuccess && data.data) {
      return data.data;
    }
    throw new Error(data.message || "Failed to fetch Day End report");
  },

  getShiftEndReport: async (dayId: number, shiftId: number): Promise<EndReportData> => {
    const { data } = await axiosInstance.get<ApiResponse<EndReportData>>(`/Cashier-log/shiftend-report/${dayId}/${shiftId}`);
    if (data.isSuccess && data.data) {
      return data.data;
    }
    throw new Error(data.message || "Failed to fetch Shift End report");
  },

  getDayClosedLogs: async (asOnDate: string): Promise<DayClosedLog[]> => {
    const { data } = await axiosInstance.get<ApiResponse<DayClosedLog[]>>(`/session-closings/day-closed-logs?asOnDate=${asOnDate}`);
    if (data.isSuccess && data.data) {
      return data.data;
    }
    throw new Error(data.message || "Failed to fetch Day Closed Logs");
  },

  getShiftClosedLogs: async (asOnDate: string): Promise<ShiftClosedLog[]> => {
    const { data } = await axiosInstance.get<ApiResponse<ShiftClosedLog[]>>(`/session-closings/shift-closed-logs?asOnDate=${asOnDate}`);
    if (data.isSuccess && data.data) {
      return data.data;
    }
    throw new Error(data.message || "Failed to fetch Shift Closed Logs");
  },

  getVoidOrderSummary: async (fromDate: string, toDate: string, decimals?: number): Promise<VoidOrderSummaryItem[]> => {
    const dec = decimals ?? 3;
    const { data } = await axiosInstance.get<ApiResponse<VoidOrderSummaryItem[]>>(`/session-closings/void-order-summary`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: dec
      }
    });
    if (data.isSuccess && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  getVoidProductSummary: async (fromDate: string, toDate: string, decimals?: number): Promise<VoidProductSummaryItem[]> => {
    const dec = decimals ?? 3;
    const { data } = await axiosInstance.get<ApiResponse<VoidProductSummaryItem[]>>(`/session-closings/void-product-summary`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: dec
      }
    });
    if (data.isSuccess && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  getVoidInvoiceSummary: async (fromDate: string, toDate: string, decimals?: number): Promise<VoidInvoiceSummaryItem[]> => {
    const dec = decimals ?? 3;
    const { data } = await axiosInstance.get<ApiResponse<VoidInvoiceSummaryItem[]>>(`/session-closings/void-invoice-summary`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: dec
      }
    });
    if (data.isSuccess && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  getInvoiceComplementarySummary: async (fromDate: string, toDate: string, decimals?: number): Promise<InvoiceComplementarySummaryItem[]> => {
    const dec = decimals ?? 3;
    const { data } = await axiosInstance.get<ApiResponse<InvoiceComplementarySummaryItem[]>>(`/session-closings/invoice-complementory-summary`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: dec
      }
    });
    if (data.isSuccess && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  getDriverSummary: async (fromDate: string, toDate: string, decimals?: number): Promise<DriverSummaryItem[]> => {
    const dec = decimals ?? 3;
    const { data } = await axiosInstance.get<ApiResponse<DriverSummaryItem[]>>(`/session-closings/driver-summary`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: dec
      }
    });
    if (data.isSuccess && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  getAllTransactionSummary: async (fromDate: string, toDate: string, decimals?: number): Promise<AllTransactionSummaryItem[]> => {
    const dec = decimals ?? 3;
    const { data } = await axiosInstance.get<ApiResponse<AllTransactionSummaryItem[]>>(`/session-closings/all_transaction-summary`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: dec
      }
    });
    if (data.isSuccess && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  }
};

export interface VoidOrderSummaryItem {
  sNo: number;
  orderNo: number;
  orderType: string;
  date: string;
  employee: string;
  reason: string;
  amount: string | number;
}

export interface VoidProductSummaryItem {
  sNo: number;
  orderNo: number;
  orderType: string;
  voidDate: string;
  employee: string;
  product: string;
  quantity: number;
  unit: string;
  amount: string | number;
}

export interface VoidInvoiceSummaryItem {
  sNo: number;
  billNo: string;
  orderNo: number;
  date: string;
  orderType: string;
  employee: string;
  amount: string | number;
}

export interface InvoiceComplementarySummaryItem {
  sNo: number;
  billNo: string;
  date: string;
  customer: string;
}

export interface DriverSummaryItem {
  sNo: number;
  driver: string;
  amount: string | number;
}

export interface AllTransactionSummaryItem {
  particular: string;
  amount: string | number;
}
