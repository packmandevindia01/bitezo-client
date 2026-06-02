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
  }
};
