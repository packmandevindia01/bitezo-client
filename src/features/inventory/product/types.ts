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

export interface ProductListItem {
  productId: number;
  sNo: number;
  code: string;
  name: string;
  unit: string;
  cost: number;
  category: string;
  group: string;
}

export interface ProductDetail {
  product: {
    id: number;          // API returns "id" not "productId"
    code: string;
    name: string;
    arabicName: string | null;
    categoryId: number;
    subcatId: number;    // API uses lowercase "subcatId"
    groupId: number;
    typeId: number;
    unitId: number;
    pvatId: number;      // API uses lowercase "pvatId"
    svatId: number;      // API uses lowercase "svatId"
    cost: number;
    branchId: number;
    fileName: string;
    filePath: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[] | null;            // API returns an array
  altproduct: AltProductItem[] | null;
}

export interface CreateProductPayload {
  code: string;
  name: string;
  arabicName: string;
  categoryId: number;
  subCatId: number;
  groupId: number;
  typeId: number;
  unitId: number;
  pVatId: number;
  sVatId: number;
  cost: number;
  branchId: number;
  fileName: string;
  filePath: string;
  isActive: boolean;
  createdAt: string;
  altProducts: AltProductItem[];
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
  branchId: string;
  isActive: boolean;
  // File handling
  fileName?: string;
  filePath?: string;
}

/** Internal UI state for alternative products */
export interface AltProductDraft extends Omit<AltProductItem, "price"> {
  id: number; // local ID for list tracking
  price: string;
}
