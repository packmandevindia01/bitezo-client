export interface ProductWiseStockTransferParams {
  FromBranchId: number;
  ToBranchId: number;
  ProductId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface ProductWiseStockTransferRow {
  transId: number;
  sNo: number;
  transDate: string;
  refNo: number;
  fromBranch: string;
  toBranch: string;
  product: string;
  code: string;
  qty: number;
  unit: string;
  price: string | number;
  netAmount: string | number;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface ProductOption {
  productId: number;
  productName: string;
  code: string;
}
