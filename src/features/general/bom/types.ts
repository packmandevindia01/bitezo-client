export interface BomLineItem {
  id: number;
  productId: number;
  productName: string;
  code: string;
  unitId: number;
  unitName: string;
  qty: number;
}

export interface BomForm {
  bomName: string;
  branchId: string;
  
  finishedProduct: string; // productId
  finishedProductCode: string; // barcode/code
  finishedProductUnit: string; // unitId
  finishedProductUnitName: string; // display text
  finishedProductQty: string;
  
  // Current adding line item state
  product: string; // productId
  code: string;
  unit: string; // unitId
  unitName: string; // display text
  qty: string;
}

export interface BomPayload {
  transId?: number;
  bomName: string;
  productId: number;
  unitId: number;
  qty: number;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
  details: {
    productId: number;
    unitId: number;
    qty: number;
    baseQty: number;
  }[];
}

export interface BomDetailParams {
  BranchId?: number;
  ProductId?: number;
  UnitId?: number;
  Decimals?: number;
}
