export interface PurchaseInvoiceLineItem {
  id: number;
  product: string;
  code: string;
  unit: string;
  qty: number;
  foc: number;
  price: number;
  vatPercent: number;
  discPercent: number;
}

export interface PurchaseInvoiceForm {
  series: string;
  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;
  invoiceDate: string;
  supplier: string;
  branch: string;
  salesman: string;
  
  product: string;
  code: string;
  unit: string;
  qty: string;
  foc: string;
  price: string;
  vatPercent: string;
  discPercent: string;
  
  discAmount: string;
  paymode: string;
  narration: string;
  otherCharge: string;
  roundOff: string;
}
