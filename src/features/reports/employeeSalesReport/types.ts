export interface EmployeeSalesReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface EmployeeSalesData {
  employeeId: number;
  sNo: number;
  employee: string;
  code: string;
  netValue: string | number;
  vatAmount: string | number;
  netAmount: string | number;
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
