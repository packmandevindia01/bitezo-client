export interface StockAdjustmentReportItem {
  transId: number;
  sNo: number;
  transDate: string;
  refNo: number;
  branch: string;
  employee: string;
  netAmount: string | number;
}

export interface StockAdjustmentReportFilters {
  branchId: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface EmployeeOption {
  empId: number;
  empName: string;
}
