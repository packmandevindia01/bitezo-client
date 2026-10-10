export interface BillWiseLevyReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface BillWiseLevyRow {
  sNo?: number;
  invDate?: string;
  invNo?: string;
  netValue?: number | string;
  serviceCharge?: number | string;
  levy?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface BillWiseLevyTotalData {
  netValue?: number | string;
  serviceCharge?: number | string;
  levy?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface BillWiseLevyReportData {
  billData: BillWiseLevyRow[] | null;
  totalData: BillWiseLevyTotalData | null;
}

export interface BillWiseLevyReportResponse {
  data: BillWiseLevyReportData;
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
  errors?: any[];
}
