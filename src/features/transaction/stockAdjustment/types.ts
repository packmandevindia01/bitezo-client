export interface StockAdjustmentLineItem {
  id: number;
  productId: number;
  product: string;
  code: string;
  unitId: number;
  unit: string;
  qty: number;
  cost: number;
  typeId: number;
  type: string;
  effect: string;
  amount: number;
}

export interface StockAdjustmentForm {
  series: string;
  refNo: string;
  date: string;
  branch: string;
  salesman: string;
  
  // Current adding line item state
  product: string;
  code: string;
  unit: string;
  qty: string;
  cost: string;
  amount: string;
  type: string;
  effect: string;
}

export interface StockAdjustmentPayloadDetail {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  amount: number;
  baseQty: number;
  typeId: number;
  effect: string;
}

export interface StockAdjustmentPayload {
  transDate: string;
  branchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  createdAt: string;
  details: StockAdjustmentPayloadDetail[];
}

export interface StockAdjustmentDetailParams {
  BranchId?: number;
  FromDate?: string;
  ToDate?: string;
  RefNo?: string;
  Decimals?: number;
}
