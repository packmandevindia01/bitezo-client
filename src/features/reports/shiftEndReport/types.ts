export interface ShiftEndReportParams {
  BranchId: number;
  UserId: number;
  CounterId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface ShiftEndReportResponse {
  columns: string[];
  rows: Record<string, any>[];
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: any[];
  isSuccess: boolean;
  timestamp: string;
  debug: any | null;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface UserOption {
  userId: number;
  userName: string;
  branch: string;
  isActive: string;
}

export interface CounterOption {
  counterId: number;
  counterName: string;
}
