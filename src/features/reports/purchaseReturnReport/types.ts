export interface PurchaseReturnReportParams {
  BranchId: number;
  SeriesId: number;
  FromDate: string;
  ToDate: string;
  SupplierId: number;
  PaymodeId: number;
  Decimals: number;
}

export interface PurchaseReturnData {
  purchaseReturnId: number;
  sNo: number;
  invoiceDate: string;
  invoiceNo: string;
  refNo?: string;
  supplierCode: string;
  supplierName: string;
  employee?: string;
  paymode: string;
  netValue: string | number;
  vatAmount: string | number;
  billsundry?: string | number;
  roundOff?: string | number;
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

export interface PurchaseReturnReportResponse {
  purchaseReturnData: PurchaseReturnData[];
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

export interface SupplierOption {
  supplierId: number;
  code: string;
  supplierName: string;
}
