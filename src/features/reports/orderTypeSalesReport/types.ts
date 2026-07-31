export interface OrderTypeSalesReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface OrderTypeSalesReportData {
  columns: string[];
  rows: Record<string, string | number>[];
}

export interface OrderTypeSalesReportResponse {
  data: OrderTypeSalesReportData;
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
