export interface HourlySalesReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface HourlySalesReportData {
  columns: string[];
  rows: Record<string, string | number>[];
}

export interface HourlySalesReportResponse {
  data: HourlySalesReportData;
  status: number;
  message: string;
  isSuccess: boolean;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
}
