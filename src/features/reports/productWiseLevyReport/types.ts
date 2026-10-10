export interface ProductWiseLevyReportParams {
  BranchId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface ProductWiseLevyRow {
  sNo?: number;
  product?: string;
  code?: string;
  netValue?: number | string;
  serviceCharge?: number | string;
  levy?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface ProductWiseLevyTotalData {
  netValue?: number | string;
  serviceCharge?: number | string;
  levy?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface ProductWiseLevyReportData {
  productData: ProductWiseLevyRow[] | null;
  totalData: ProductWiseLevyTotalData | null;
}

export interface ProductWiseLevyReportResponse {
  data: ProductWiseLevyReportData;
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
