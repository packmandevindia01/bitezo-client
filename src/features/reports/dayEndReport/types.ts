export interface DayEndReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface DayEndReportResponse {
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
