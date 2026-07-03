export interface ProductWisePurchaseReportParams {
  BranchId?: number;
  productId?: number;
  supplierId?: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface ProductWisePurchaseData {
  purchaseId: number;
  sNo: number;
  "p/R Number": string;
  invoiceDate: string;
  invoiceNo: string;
  supplierName: string;
  productCode: string;
  productnName: string;
  qty: number;
  unit: string;
  price: string | number;
  discount: string | number;
  netValue: string | number;
  vatAmount: string | number;
  netAmount: string | number;
}

export interface ProductWiseTotalData {
  discount: string | number;
  netValue: string | number;
  vatAmount: string | number;
  netAmount: string | number;
}

export interface ProductWisePurchaseReportResponse {
  purchaseData: ProductWisePurchaseData[];
  totalData: ProductWiseTotalData;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface SupplierOption {
  supplierId: number;
  code: string;
  supplierName: string;
}

export interface ProductOption {
  productId: number;
  productName: string;
  code: string;
  barcode: string;
}
