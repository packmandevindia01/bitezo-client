// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: ApiError[];
  isSuccess: boolean;
}

export interface ApiError {
  code: string;
  field: string | null;
  message: string;
}

// ─── Master Data Types ───────────────────────────────────────────────────────

export interface MasterItem {
  id: number;
  name: string;
}

export interface UnitMasterItem extends MasterItem {
  currentvalue: number;
  category?: string;
}

export interface VatMasterItem extends MasterItem {
  value: number;
}

export interface ProductMasterData {
  unit: UnitMasterItem[];
  group: MasterItem[];
  category: MasterItem[];
  vat: VatMasterItem[];
  type: MasterItem[];
}

// ─── Product API Models ──────────────────────────────────────────────────────

export interface AltProductItem {
  unitId: number;
  barcode: string;
  isIncl: boolean;
  price: number;
  altName: string;
  altArabic: string;
  branchId: number;
}

export interface ProductColorItem {
  branchId: number;
  colorCode: string;
}

export interface OpeningStockItem {
  unitId: number;
  qty: number;
  cost: number;
  amount: number;
  baseQty: number;
  branchId: number;
}

export interface ProductListItem {
  productId: number;
  sNo: number;
  code: string;
  name: string;
  barcode: string;
  price: number;
  unit: string;
  cost: number;
  category: string;
  group: string;
}

export interface ProductDetail {
  product: {
    productId: number;
    code: string;
    name: string;
    arabicName: string | null;
    categoryId: number;
    subCatId: number;
    groupId: number;
    typeId: number;
    unitId: number;
    pVatId: number;
    sVatId: number;
    cost: number;
    price: number;
    barcode: string;
    branchId: number;
    fileName: string;
    filePath: string;
    isActive: boolean;
    priceIsIncl: boolean;
    createdAt: string;
    updatedAt: string;
    colorCode: string | null;
    oldPath?: string | null;
  } | null;
  altProducts: AltProductItem[] | null;
  productColors: ProductColorItem[] | null;
  openingStocks: OpeningStockItem[] | null;
}

export interface CreateProductPayload {
  code: string;
  name: string;
  arabicName: string | null;
  categoryId: number;
  subCatId: number;
  groupId: number;
  typeId: number;
  unitId: number;
  pVatId: number;
  sVatId: number;
  cost: number;
  price: number;
  barcode: string;
  branchId: number;
  fileName?: string;
  filePath?: string;
  isActive: boolean;
  priceIsIncl: boolean;
  colorCode: string;
  createdAt: string;
  oldPath?: string | null;
  OldPath?: string | null;
  altProducts: AltProductItem[];
  productColors: ProductColorItem[];
  openingStocks: OpeningStockItem[];
}

export interface UpdateProductPayload extends Omit<CreateProductPayload, "createdAt"> {
  productId: number;
  updatedAt: string;
}

export type { ProductFormData, AltProductFormData, ProductColorFormData, OpeningStockFormData } from "./schema/productSchema";
