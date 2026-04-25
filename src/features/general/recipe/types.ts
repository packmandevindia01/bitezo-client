export interface RecipeLineItem {
  id: number;
  product: string;
  code: string;
  unit: string;
  qty: number;
  cost: number;
  amount: number;
}

export interface RecipeForm {
  finishedProduct: string;
  finishedProductCode: string;
  finishedProductUnit: string;
  finishedProductQty: string;
  
  // Current adding line item state
  product: string;
  code: string;
  unit: string;
  qty: string;
  cost: string;

  // Summary
  otherCharge: string;
}
