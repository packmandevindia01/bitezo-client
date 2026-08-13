export interface ProductWiseStockAdjustmentParams {
  BranchId: number;
  ProductId: number;
  TypeId: number;
  Effect: string;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface ProductWiseStockAdjustmentRow {
  transId: number;
  sNo: number;
  transDate: string;
  refNo: number;
  product: string;
  code: string;
  qty: number;
  unit: string;
  price: string | number;
  netAmount: string | number;
  type: string;
  effect: string;
}

export interface ProductWiseStockAdjustmentResponse {
  data: ProductWiseStockAdjustmentRow[];
  status: number;
  message: string;
  isSuccess: boolean;
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

export interface AdjustmentTypeOption {
  typeId: number;
  typeName: string;
  effect: string;
}
