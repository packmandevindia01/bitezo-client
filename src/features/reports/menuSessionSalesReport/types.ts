export interface MenuSessionSalesReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface MenuSessionSalesReportData {
  columns: string[];
  rows: Record<string, string | number>[];
}

export interface MenuSessionSalesReportResponse {
  data: MenuSessionSalesReportData;
  status: number;
  message: string;
  correlationId?: string;
  errors?: any[];
  isSuccess: boolean;
  timestamp?: string;
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
