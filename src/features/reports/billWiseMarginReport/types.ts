export interface BillWiseMarginReportParams {
  BranchId: number;
  SeriesId: number;
  FromDate: string;
  ToDate: string;
  CustomerId: number;
  Decimals: number;
}

export interface BillWiseMarginSalesData {
  salesId: number;
  sNo: number;
  invoiceDate: string;
  invoiceNo: string;
  customerCode: string;
  customerName: string;
  netValue: string;
  cost: string;
  margin: string;
  marginper: string;
}

export interface BillWiseMarginTotalData {
  netValue: number;
  cost: number;
  margin: number;
  marginper: number;
}

export interface BillWiseMarginReportResponse {
  salesData: BillWiseMarginSalesData[];
  totalData: BillWiseMarginTotalData[];
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface CustomerOption {
  customerId: number;
  code: string;
  customerName: string;
}

export interface SeriesOption {
  seriesId: number;
  seriesName: string;
}
