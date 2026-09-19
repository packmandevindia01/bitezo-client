export interface PosCategory {
  id: number;
  name: string;
  arabicName?: string;
  imageUrl?: string | null;
  colorCode?: string;
}

export interface PosProduct {
  id: number;
  name: string;
  arabicName?: string;
  categoryId: number;
  price: number;
  sku?: string;
  prepTime?: string;
  imageUrl?: string | null;
  colorCode?: string;
  vatId?: number;
  vatValue?: number;
  unitId?: number;
  hasAlternatives?: boolean;
  isIncl?: boolean;
  isLocked?: boolean;
}

export interface PosProductSearchResult {
  productId: number;
  productName: string;
  arabicName?: string;
  vatId?: number;
  vatValue?: number;
  price: number;
  hasAlternatives: boolean;
  isLocked?: boolean;
  imageUrl?: string;
  code?: string;
  unitId?: number;
  isIncl?: boolean;
}

export interface DineInSection {
  sectionId: number;
  sectionName: string;
}

export interface DineInTable {
  tableId: number;
  tableName: string;
  positionNo: number;
  orderDate: string;
  employeeName: string | null;
  isUsed: boolean;
  status: 'available' | 'occupied';
  position: number;
  capacity: number;
}

export interface PosMenuTime {
  menuId: number;
  menuName: string;
  arabicName?: string;
}

export interface MenuGroup {
  groupId: number;
  groupName: string;
  arabicName: string;
}

export interface MenuSubCategory {
  subCategoryId: number;
  subCategoryName: string;
  arabicName: string;
  imageUrl: string | null;
}

export interface PosPaymode {
  paymodeId: number;
  paymodeName: string;
}

export interface MenuMasterData {
  menu: PosMenuTime[];
  group?: MenuGroup[];
  category: PosCategory[];
  orderTypes: { orderTypeId: number; orderType: string }[];
  paymodes: PosPaymode[];
}

export interface MenuProvider {
  providerId: number;
  providerName: string;
  imageUrl: string | null;
  paymodeId?: number;
  postAccountId?: number;
  paymode?: string;
  paymodeName?: string;
  postAccountName?: string;
}
