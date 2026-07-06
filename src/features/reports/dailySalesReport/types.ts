export interface DailySalesReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface DailySalesReportData {
  columns: string[];
  rows: Record<string, string | number>[];
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}
