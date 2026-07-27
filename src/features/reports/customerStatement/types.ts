export interface CustomerStatementParams{
    BranchId:number;
    FromDate:string;
    ToDate:string;
    CustomerId:number;
    Decimals:number;
}

export interface CustomerStatementData {
  invoiceId: number;
  voucherType: string;
  invoiceDate: string;
  invoiceNo: string;
  invoiceAmount: string | number;
  balance: string | number;
}

export interface CustomerStatementResponse {
  data: CustomerStatementData[];
}
