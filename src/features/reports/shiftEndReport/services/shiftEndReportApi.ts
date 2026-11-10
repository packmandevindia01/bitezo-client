import { unwrapReport as unwrap } from "@shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type { 
  ApiResponse, 
  ShiftEndReportResponse, 
  ShiftEndReportParams, 
  UserOption,
  CounterOption
} from "../types";


export const getShiftEndReport = async (
  params: ShiftEndReportParams
): Promise<ShiftEndReportResponse> => {
  return unwrap(
    axiosInstance.get<ApiResponse<ShiftEndReportResponse>>("/reports/shift-end-report", {
      params,
    })
  );
};

export const getUserList = async (branchId: number): Promise<UserOption[]> => {
  const data = await unwrap(
    axiosInstance.get<ApiResponse<UserOption[]>>(`/user/branches/${branchId}/userlist`)
  );
  return ((data as any[]) ?? []).map((u: any) => ({
    userId: Number(u.userId),
    userName: u.userName,
    branch: u.branch,
    isActive: u.isActive,
  }));
};

export const getCounterList = async (branchId: number): Promise<CounterOption[]> => {
  const data = await unwrap(
    axiosInstance.get<ApiResponse<CounterOption[]>>(`/counter/${branchId}/list-name`)
  );
  return ((data as any[]) ?? []).map((c: any) => ({
    counterId: Number(c.counterId),
    counterName: c.counterName,
  }));
};

export const getShiftEndCashierLogDetail = async (dayId: number, shiftId: number): Promise<any> => {
  try {
    const data = await unwrap(
      axiosInstance.get<ApiResponse<any>>(`/Cashier-log/shiftend-report/${dayId}/${shiftId}`)
    );
    return data;
  } catch {
    return null;
  }
};

