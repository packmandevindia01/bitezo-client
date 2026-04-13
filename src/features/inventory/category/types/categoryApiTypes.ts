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

export type CategoryDetailResponse = ApiResponse<CategoryDetailData>;
export type CategoryListResponse = ApiResponse<CategoryListItem[]>;

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateCategoryPayload {
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  createdAt?: string;
  branchIds: number[];
}

export interface UpdateCategoryPayload {
  id: number;
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  updatedAt?: string;
  branchIds: number[];
}