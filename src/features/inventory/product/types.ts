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
  } | null;
  altProducts: AltProductItem[] | null;
  productColors: ProductColorItem[] | null;
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
  altProducts: AltProductItem[];
  productColors: ProductColorItem[];
}

export interface UpdateProductPayload extends Omit<CreateProductPayload, "createdAt"> {
  productId: number;
  updatedAt: string;
}

// ─── UI / Form Shapes ─────────────────────────────────────────────────────────

export interface ProductFormState {
  code: string;
  name: string;
  arabicName: string;
  categoryId: string; // IDs kept as strings for Select components
  subCatId: string;
  groupId: string;
  typeId: string;
  unitId: string;
  pVatId: string;
  sVatId: string;
  cost: string;
  price: string;
  barcode: string;
  branchId: string;
  isActive: boolean;
  priceIsIncl: boolean;
  colorCode: string;
  productColors: ProductColorItem[];
  // File handling
  fileName?: string;
  filePath?: string;
  imageFile?: File;
}

/** Internal UI state for alternative products */
export interface AltProductDraft extends Omit<AltProductItem, "price"> {
  id: number; // local ID for list tracking
  price: string;
}
