export interface ProductInputVatReportParams {
  BranchId: number;
  productId?: number;
  FromDate: string;
  ToDate: string;
  vatId?: number;
  Decimals: number;
}

export interface ProductInputVatRow {
  sNo?: number;
  productId?: number;
  product?: string;
  code?: string;
  vatPer?: string;
  value?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface ProductInputVatTotalData {
  value?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface ProductInputVatReportData {
  outPutData?: ProductInputVatRow[] | null;
  inputData?: ProductInputVatRow[] | null;
  inPutData?: ProductInputVatRow[] | null;
  totalData?: ProductInputVatTotalData | null;
}

export interface ProductInputVatReportResponse {
  data: ProductInputVatReportData;
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

export interface ProductOption {
  productId?: number;
  id?: number;
  productName?: string;
  name?: string;
  productCode?: string;
  code?: string;
  barcode?: string;
  [key: string]: any;
}

export interface VatOption {
  vatId?: number;
  id?: number;
  vatName?: string;
  name?: string;
  vatValue?: number;
  value?: number;
  [key: string]: any;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
  errors?: any[];
}
