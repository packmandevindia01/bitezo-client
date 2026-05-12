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
  vatValue?: number;
}

export interface PosCartItem {
  productId: number;
  quantity: number;
  variantName?: string;
  price?: number;
  discountValue?: number;
  discountType?: 'percentage' | 'amount';
  extras?: { id: number; name: string; price: number; qty: number }[];
  modifiers?: { id: number; name: string; qty: number }[];
}

export interface PosQuickAction {
  id: string;
  label: string;
}

export interface PosTenderOption {
  id: string;
  label: string;
}

export interface DineInSection {
  sectionId: number;
  sectionName: string;
}

export interface DineInTable {
  tableId: number;
  tableName: string;
  capacity: number;
  status: 'available' | 'occupied';
}

export interface GeneralPrinterSettings {
  billPrinter: string;
  kotPrinter: string;
  packagerPrinter: string;
  masterKOT: string;
  masterKOTCount: number;
  masterKOTBillCount: number;
  androidBillPrinter: string;
  androidKOTPrinter: string;
  androidPackagerPrinter: string;
}

export interface CategoryPrinterSetting {
  categoryId: number;
  category?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface ProductPrinterSetting {
  productId: number;
  product?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface SectionPrinterSetting {
  sectionId: number;
  section?: string;
  firstPrinter: string;
  secondPrinter: string;
}

export interface OrderTypePrinterSetting {
  orderType: string;
  printer: string;
}
// ─── Menu API Types ──────────────────────────────────────────────────────────

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

export interface MenuMasterData {
  group: MenuGroup[];
  category: PosCategory[];
}

export interface PosAlternative {
  altName: string;
  altArabic: string;
  isIncl: boolean;
  price: number;
  unitId: number;
}

export interface PosExtra {
  id: number;
  name: string;
  arabicName?: string;
  price: number;
}

export interface PosExtraType {
  typeId: number;
  typeName: string;
  arabicName?: string;
}

export interface PosModifier {
  id: number;
  name: string;
  arabicName?: string;
}

export interface PosModifierType {
  typeId: number;
  typeName: string;
  arabicName?: string;
}
