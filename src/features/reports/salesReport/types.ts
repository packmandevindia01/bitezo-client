// Vite HMR trigger
export interface SalesReportParams {
  BranchId: number;
  SeriesId: number;
  FromDate: string;
  ToDate: string;
  CustomerId: number;
  PaymodeId: number;
  Decimals: number;
}

export interface SalesData {
  salesId: number;
  sNo: number;
  invoiceDate: string;
  invoiceNo: string;
  customerCode: string;
  customerName: string;
  paymode: string;
  netValue: string | number;
  vatAmount: string | number;
  netAmount: string | number;
}

export interface PaymodeData {
  paymodeId: number;
  paymodeName: string;
  amount: number;
}

export interface TotalData {
  netValue: number;
  vatAmount: number;
  netAmount: number;
}

export interface SalesReportResponse {
  salesData: SalesData[];
  paymodeData: PaymodeData[];
  totalData: TotalData[];
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface PaymodeOption {
  paymodeId: number;
  sNo: number;
  code: number;
  paymodeName: string;
  isActive: string;
}

export interface CustomerOption {
  customerId: number;
  code: string;
  customerName: string;
}
