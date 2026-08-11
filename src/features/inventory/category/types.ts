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

export interface BranchAllocation {
  branchId: number;
  colorCode: string;
}

export interface CategoryListItem {
  id: number;
  code: string;
  name: string;
  arabic: string;
  colorCode: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  branches: BranchOption[];
}

export interface CategoryDetailData {
  category: (CategoryListItem & { posStatus?: boolean }) | null;
  branch: (BranchOption & { colorCode?: string })[] | null;
  group: BranchOption[] | null;
  menu?: { id: number; name: string; menuId?: number }[] | null;
}

export interface CategoryFormState {
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  posStatus: boolean;
  colorCode: string;
  branchAllocations: BranchAllocation[];
  menuIds: number[];
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
  posStatus: boolean;
  colorCode: string;
  createdAt: string;
  branchIds: BranchAllocation[];
  menuIds: number[];
}

export interface UpdateCategoryPayload {
  id: number;
  code: string;
  name: string;
  arabic: string;
  isActive: boolean;
  posStatus: boolean;
  colorCode: string;
  updatedAt: string;
  branchIds: BranchAllocation[];
  menuIds: number[];
}
