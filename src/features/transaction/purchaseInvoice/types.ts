export interface PurchaseInvoiceLineItem {
  id: number;
  product: string;
  code: string;
  unit: string;
  qty: number;
  foc: number;
  price: number;
  vatId: number;
  vatPercent: number;
  discPercent: number;
}

export interface PurchasePaymentLine {
  mode: 'cash' | 'card' | 'credit';
  amount: number;
}

export interface PurchaseInvoiceForm {
  series: string;
  purchaseNo: string;
  purchaseDate: string;
  invoiceNo: string;
  refNo: string;
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
  vatId: string;
  vatPercent: string;
  discPercent: string;
  
  globalDiscPercent: string;
  discAmount: string;
  narration: string;
  otherCharge: string;
  roundOff: string;
}
