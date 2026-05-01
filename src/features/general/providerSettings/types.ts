export interface ProviderSettingEntry {
  productId: number;
  unitId: number;
  productName: string;
  productCode: string;
  altName: string;
  isIncl: boolean;
  exclPrice: number;
  inclPrice: number;
  price: number;
}

export interface ProviderSettingsState {
  providerId: number;
  date: string;
  branchId: number;
  categoryId: number;
  subCategoryId: number;
  entries: ProviderSettingEntry[];
}

export interface ProviderSettingsDetail {
  productId: number;
  unitId: number;
  isIncl: boolean;
  price: number;
}

export interface ProviderSettingsPayload {
  transId?: number;
  branchId: number;
  providerId: number;
  createdAt?: string;
  updatedAt?: string;
  details: ProviderSettingsDetail[];
}

export interface ProviderMasterItem {
  providerId: number;
  providerName: string;
}

export interface BranchMasterItem {
  branchId: number;
  branchName: string;
}

export interface CategoryMasterItem {
  categoryId: number;
  categoryName: string;
}

export interface ProviderSettingsMasterData {
  provider: ProviderMasterItem[];
  branch: BranchMasterItem[];
  category: CategoryMasterItem[];
}

export interface ProviderSettingsProduct {
  product: string;
  barcode: string;
  altName: string;
  isIncl: boolean;
  price: number;
  productId: number;
  unitId: number;
}

export interface ProductSearchItem {
  productName: string;
  barcode: string;
  altName: string;
  productId: number;
  unitId: number;
  price?: number;
  isIncl?: boolean;
}

// From GET /api/provider-settings/{transId}/provider-settings-data
export interface ProviderSettingsListItem {
  transId: number;
  sNo: number;
  provider: string;
  branch: string;
}

export interface ProviderSettingsMaster {
  transId: number;
  branchId: number;
  providerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderSettingsDetailItem {
  sNo: number;
  product: string;
  barcode: string;
  altName: string;
  isIncl: boolean;
  price: number;
  productId: number;
  unitId: number;
}

export interface ProviderSettingsData {
  master: ProviderSettingsMaster;
  details: ProviderSettingsDetailItem[];
}

// For list_alt_name endpoint
export interface AltNameItem {
  unitId: number;
  altName: string;
  price?: number;
  isIncl?: boolean;
}