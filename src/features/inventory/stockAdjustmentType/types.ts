export interface StockAdjustmentType {
  typeId: number;
  sNo: number;
  typeName: string;
  effect: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockAdjustmentTypePayload {
  typeName: string;
  effect: string;
}
