export interface ProductWiseMarginReportParams {
  BranchId: number;
  ProductId: number;
  GroupId: number;
  CategoryId: number;
  SubcategoryId: number;
  FromDate: string;
  ToDate: string;
  Decimals: number;
}

export interface ProductWiseMarginProductsData {
  productId: number;
  sNo: number;
  productCode: string;
  productName: string;
  group: string;
  category: string;
  subCategory: string;
  netValue: string;
  cost: string;
  margin: string;
  marginPer: string;
}

export interface ProductWiseMarginTotalData {
  netValue: number;
  cost: number;
  margin: number;
  marginper: number;
}

export interface ProductWiseMarginReportResponse {
  productsData: ProductWiseMarginProductsData[];
  totalData: ProductWiseMarginTotalData[];
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface ProductOption {
  productId: number;
  code: string;
  name: string;
}

export interface GroupOption {
  grpId: number;
  name: string;
}

export interface CategoryOption {
  catId: number;
  catName: string;
}

export interface SubCategoryOption {
  subCatId: number;
  name: string;
}
