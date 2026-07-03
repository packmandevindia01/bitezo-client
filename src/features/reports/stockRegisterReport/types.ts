export interface StockRegisterReportParams {
  BranchId?: number;
  GroupId?: number;
  CategoryId?: number;
  SubCategoryId?: number;
  ProductTypeId?: number;
  ProductId?: number;
  AsOndate: string; // YYYY-MM-DD
  Decimals: number;
}

export interface StockRegisterProductData {
  productId: number;
  sNo: number;
  productCode: string;
  productName: string;
  group: string;
  category: string;
  stock: string;
  cost: string | number;
  value: string | number;
}

export interface StockRegisterTotalData {
  totalValue: string | number;
}

export interface StockRegisterResponse {
  productData: StockRegisterProductData[];
  totalData: StockRegisterTotalData | null;
}

// Master Dropdown option structures
export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface GroupOption {
  id: number;
  name: string;
}

export interface CategoryOption {
  id: number;
  name: string;
}

export interface SubCategoryOption {
  id: number;
  name: string;
}

export interface ProductTypeOption {
  productTypeId: number;
  productTypeName: string;
}

export interface ProductOption {
  productId: number;
  productName: string;
  code?: string;
  barcode?: string;
}
