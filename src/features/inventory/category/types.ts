// --- From categoryApiTypes.ts ---
// ── Branch ────────────────────────────────────────────────────────────────────

export interface BranchOption {
  id: number;
  name: string;
}

// ── API wrapper shape ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: string[];
  isSuccess: boolean;
}

// ── Category list item (from GET /api/category/category-list) ─────────────────

export interface CategoryListItem {
  id: number;
  code: string;
  name: string;
  arabic?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  branches: BranchOption[];
}

// ── Category detail (from GET /api/category/{catId}/catid-data) ───────────────

export interface CategoryDetailData {
  category: CategoryListItem | null;
  branch: BranchOption[] | null;
}
// ── Branch ────────────────────────────────────────────────────────────────────

export interface BranchOption {
  id: number;
  name: string;
}

// ── API wrapper shape ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: string[];
  isSuccess: boolean;
}

// ── Category list item (from GET /api/category/category-list) ─────────────────

export interface CategoryListItem {
  id: number;
  code: string;
  name: string;
  arabic?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  branches: BranchOption[];
}

// ── Category detail (from GET /api/category/{catId}/catid-data) ───────────────

export interface CategoryDetailData {
  category: CategoryListItem | null;
  branch: BranchOption[] | null;
}

export interface CategoryFormState {
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  branchIds: number[];
  imageFile?: File;
}

export type CategoryDetailResponse = ApiResponse<CategoryDetailData>;
export type CategoryListResponse = ApiResponse<CategoryListItem[]>;

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateCategoryPayload {
  CatCode: string;
  CatName: string;
  CatArabic: string;
  IsActive: boolean;
  CreatedAt?: string;
  BranchIds: number[];
}

export interface UpdateCategoryPayload {
  CatId: number;
  CatCode: string;
  CatName: string;
  CatArabic: string;
  IsActive: boolean;
  UpdatedAt?: string;
  BranchIds: number[];
}

// --- From types.ts ---
export interface CategoryRecord {
  id: number;
  code: string;
  name: string;
  image?: string;
  branches: string[];
}


