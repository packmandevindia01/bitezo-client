export interface InternalStockTransferLineItem {
  id: number;
  productId: number;
  productName: string;
  code: string;
  unitId: number;
  unitName: string;
  qty: number;
  cost: number;
  amount: number;
}

export interface InternalStockTransferForm {
  refNo: string;
  transDate: string;
  fromBranch: string; // branchId
  toBranch: string; // branchId
  salesman: string; // employeeId

  // Line item builder
  product: string; // productId
  code: string;
  unit: string; // unitId
  unitName: string; // display
  qty: string;
  cost: string;
  amount: string; // qty * cost
}
