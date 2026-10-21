export interface SupplierBalanceParams {
  BranchId: number;
  SupplierId?: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface SupplierBalanceItem {
  supplierId?: number;
  id?: number;
  code: string;
  name: string;
  opening: string | number;
  issued: string | number;
  paid: string | number;
  balance: string | number;
}

export interface SupplierBalanceResponse {
  data: {
    summaryData: SupplierBalanceItem[] | null;
    totalData: {
      total: string | number;
    } | null;
  };
  status: number;
  message: string;
  isSuccess: boolean;
}
