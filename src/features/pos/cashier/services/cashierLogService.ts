import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";

export interface DenominationEntry {
  denominationId: number;
  cashCount: number;
}

export interface OpenDayRequest {
  startDate: string;
  branchId: number;
  transDate: string;
  userId: number;
  openingBal: number;
  counterId: number;
  denominations: DenominationEntry[];
}

export interface OpenShiftRequest {
  dayId: number;
  startDate: string;
  branchId: number;
  transDate: string;
  userId: number;
  openingBal: number;
  counterId: number;
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
  branchId?: number;
  counterId?: number;
}

export const cashierLogService = {
  checkStatus: async (branchId?: number, counterId?: number): Promise<CashierInStatus> => {
    const params = new URLSearchParams({ clientDb: 'app_db' });
    if (branchId) params.append('branchId', branchId.toString());
    if (counterId) params.append('counterId', counterId.toString());

    const { data } = await axiosInstance.get<ApiResponse<CashierInStatus>>(`/Cashier-log/iscashier-in?${params.toString()}`);
    if (data.isSuccess && data.data) {
      return data.data;
    }
    throw new Error(data.message || "Failed to check cashier status");
  },

  // Helper to wrap payload in dto as per Swagger
  wrap: (payload: any) => ({ dto: payload }),

  openDay: async (payload: OpenDayRequest): Promise<any> => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/Cashier-log/open_day", cashierLogService.wrap(payload));
    return data;
  },

  openShift: async (payload: OpenShiftRequest): Promise<any> => {
    const { data } = await axiosInstance.post<ApiResponse<any>>("/Cashier-log/open_shift", cashierLogService.wrap(payload));
    return data;
  },

  closeDay: async (payload: CloseDayRequest): Promise<any> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>("/Cashier-log/close-day", cashierLogService.wrap(payload));
    return data;
  },

  closeShift: async (payload: CloseShiftRequest): Promise<any> => {
    const { data } = await axiosInstance.put<ApiResponse<any>>("/Cashier-log/close-shift", cashierLogService.wrap(payload));
    return data;
  }
};
