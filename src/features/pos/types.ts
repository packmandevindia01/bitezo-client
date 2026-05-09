export interface PosCategory {
  id: string;
  name: string;
  description: string;
}

export interface PosProduct {
  id: number;
  name: string;
  categoryId: string;
  price: number;
  sku: string;
  prepTime: string;
  bestseller?: boolean;
}

export interface PosCartItem {
  productId: number;
  quantity: number;
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
