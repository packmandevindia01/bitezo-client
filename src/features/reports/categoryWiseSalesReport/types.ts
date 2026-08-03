export interface CategoryWiseSalesReportParams {
  BranchId: number;
  CategoryId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface CategoryWiseSalesRow {
  categoryId?: number;
  catId?: number;
  categoryCode?: string;
  catCode?: string;
  code?: string;
  categoryName?: string;
  catName?: string;
  name?: string;
  category?: string;
  qty?: number | string;
  quantity?: number | string;
  totalQty?: number | string;
  amount?: number | string;
  discount?: number | string;
  netValue?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface CategoryWiseTotalData {
  amount?: number | string;
  discount?: number | string;
  netValue?: number | string;
  vatAmount?: number | string;
  netAmount?: number | string;
  [key: string]: any;
}

export interface CategoryWiseSalesReportData {
  categoryData: CategoryWiseSalesRow[] | null;
  totalData: CategoryWiseTotalData | null;
}

export interface CategoryWiseSalesReportResponse {
  data: CategoryWiseSalesReportData;
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

export interface CategoryOption {
  catId: number;
  catCode?: string;
  catName: string;
  isActive?: string | boolean;
  [key: string]: any;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
  errors?: any[];
}
