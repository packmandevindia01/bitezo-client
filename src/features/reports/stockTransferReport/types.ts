export interface StockTransferReportParams {
  FromBranchId: number;
  ToBranchId: number;
  EmployeeId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface StockTransferReportRow {
  transId: number;
  sNo: number;
  transDate: string;
  refNo: number;
  fromBranch: string;
  toBranch: string;
  employee: string;
  netAmount: string | number;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface EmployeeOption {
  empId: number;
  empName: string;
}
