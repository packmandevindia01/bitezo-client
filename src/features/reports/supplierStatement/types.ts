export interface SupplierStatementParams{
    BranchId:number;
    FromDate:string;
    ToDate:string;
    SupplierId:number;
    Decimals:number;
}

export interface SupplierStatementData {
  invoiceId: number;
  voucherType: string;
  invoiceDate: string;
  invoiceNo: string;
  invoiceAmount: string | number;
  balance: string | number;
}

export interface SupplierStatementResponse {
  data: SupplierStatementData[];
}