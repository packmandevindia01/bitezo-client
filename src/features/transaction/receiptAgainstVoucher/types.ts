export interface ReceiptAgainstVoucherLineItem {
  id: number;
  vchType: string;
  vchNo: string;
  invAmnt: number;
  paid: number;
  balance: number;
  amount: number;
}

export interface ReceiptAgainstVoucherForm {
  series: string;
  vchNo: string;
  date: string;
  customer: string;
  
  vchType: string;
  vchNoInput: string;
  invAmnt: string;
  paid: string;
  balance: string;
  amount: string;
  
  narration: string;
  paymode: string;
  payments?: { mode: string; amount: number }[];
}
