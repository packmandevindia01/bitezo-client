export interface ProviderSettingEntry {
  productId: number;
  unitId: number;
  productName: string;
  productCode: string;
  altName: string;
  exclPrice: number;
  inclPrice: number;
}


export interface ProviderSettingsState {
  providerId: number;
  date: string;
  branchId: number;
  categoryId: number;
  subCategoryId: number;
  entries: ProviderSettingEntry[];
}

export interface ProviderSettingsPayload {
  providerId: number;
  date: string;
  branchId: number;
  categoryId: number;
  subCategoryId: number;
  entries: ProviderSettingEntry[];
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

