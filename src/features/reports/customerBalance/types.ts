export interface CustomerBalanceParams {
  BranchId: number;
  Customerid?: number;
  CustomerId?: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface CustomerBalanceItem {
  customerId?: number;
  code: string;
  name: string;
  opening: string | number;
  issued: string | number;
  paid: string | number;
  balance: string | number;
}

export interface CustomerBalanceResponse {
  data: {
    summaryData: CustomerBalanceItem[] | null;
    totalData: {
      total: string | number;
    } | null;
  };
  status: number;
  message: string;
  isSuccess: boolean;
}
