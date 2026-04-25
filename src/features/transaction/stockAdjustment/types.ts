export interface StockAdjustmentLineItem {
  id: number;
  product: string;
  code: string;
  unit: string;
  qty: number;
  cost: number;
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
