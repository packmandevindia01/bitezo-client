export interface BranchOption {
  id: number;
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: string[];
  isSuccess: boolean;
}

export interface CategoryListItem {
  id: number;
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  branches: BranchOption[];
}

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
  image?: string; // Preview URL
}

export type CategoryDetailResponse = ApiResponse<CategoryDetailData>;
export type CategoryListResponse = ApiResponse<CategoryListItem[]>;

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateCategoryPayload {
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  createdAt: string;
  branchIds: number[];
}

export interface UpdateCategoryPayload {
  id: number;
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  updatedAt: string;
  branchIds: number[];
}
