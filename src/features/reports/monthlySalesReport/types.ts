export interface MonthlySalesReportParams {
  BranchId: number;
  FromMonth: number;
  FromYear: number;
  ToMonth: number;
  ToYear: number;
  Decimals: number;
}

export interface MonthlySalesReportResponse {
  data: {
    columns: string[];
    rows: Record<string, string>[];
  };
  isSuccess: boolean;
  message: string;
}

export interface MonthlySalesReportFilters {
  branchId: string;
  setBranchId: (val: string) => void;
  fromPeriod: string; // YYYY-MM
  setFromPeriod: (val: string) => void;
  toPeriod: string; // YYYY-MM
  setToPeriod: (val: string) => void;
}
