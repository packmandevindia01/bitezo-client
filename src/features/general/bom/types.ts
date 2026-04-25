export interface BomLineItem {
  id: number;
  product: string;
  code: string;
  unit: string;
  qty: number;
}

export interface BomForm {
  finishedProduct: string;
  finishedProductCode: string;
  finishedProductUnit: string;
  finishedProductQty: string;
  
  // Current adding line item state
  product: string;
  code: string;
  unit: string;
  qty: string;
}
