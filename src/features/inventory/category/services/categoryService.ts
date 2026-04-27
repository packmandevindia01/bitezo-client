import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  BranchOption,
  CategoryDetailResponse,
  CategoryListItem,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "../types";

// ── Category endpoints ────────────────────────────────────────────────────────

export const getCategories = async (
  catCode?: string,
  catName?: string
): Promise<CategoryListItem[]> => {
  const params: Record<string, string> = {};
  if (catCode) params.catCode = catCode;
  if (catName) params.catName = catName;

  const { data } = await axiosInstance.get<ApiResponse<CategoryListItem[]>>(
    "/category/category-list",
    { params }
  );
  return ((data.data as any[]) ?? []).map((item) => ({
    id: item.catId ?? item.id,
    code: item.catCode || item.code,
    name: item.catName || item.name,
    isActive: item.isActive === "Active" || item.isActive === true,
    arabic: "",
    branches: [],
  }));
};

export const getCategoryById = async (id: number): Promise<CategoryDetailResponse["data"]> => {
  const { data } = await axiosInstance.get<CategoryDetailResponse>(
    `/category/${id}/catid-data`
  );
  return data.data;
};

export const createCategory = async (
  payload: CreateCategoryPayload & { imageFile?: File }
): Promise<ApiResponse<unknown>> => {
  const formData = new FormData();
  formData.append("catCode", payload.CatCode);
  formData.append("catName", payload.CatName);
  formData.append("catArabic", payload.CatArabic);
  formData.append("isActive", payload.IsActive ? "true" : "false");
  formData.append("createdAt", payload.CreatedAt || new Date().toISOString());

  if (payload.BranchIds && payload.BranchIds.length > 0) {
    payload.BranchIds.forEach((id) => {
      formData.append("branchIds", String(id));
    });
  }

  if (payload.imageFile) {
    formData.append("CategoryImage", payload.imageFile);
  }

  const { data } = await axiosInstance.post<ApiResponse<unknown>>("/category", formData);
  return data;
};

export const updateCategory = async (
  id: number,
  payload: UpdateCategoryPayload & { imageFile?: File }
): Promise<ApiResponse<unknown>> => {
  const url = `/category/${id}`;
  const formData = new FormData();
  formData.append("catId", String(id));
  formData.append("catCode", payload.CatCode);
  formData.append("catName", payload.CatName);
  formData.append("catArabic", payload.CatArabic);
  formData.append("isActive", payload.IsActive ? "true" : "false");
  formData.append("updatedAt", payload.UpdatedAt || new Date().toISOString());

  if (payload.BranchIds && payload.BranchIds.length > 0) {
    payload.BranchIds.forEach((id) => {
      formData.append("branchIds", String(id));
    });
  }

  if (payload.imageFile) {
    formData.append("CategoryImage", payload.imageFile);
  }

  // Switch to POST for update to be consistent with Product pattern
  const { data } = await axiosInstance.post<ApiResponse<unknown>>(url, formData);
  return data;
};

export const deleteCategory = async (id: number): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosInstance.delete<ApiResponse<unknown>>(`/category/${id}`);
  return data;
};

// ── Branch endpoint ───────────────────────────────────────────────────────────

interface BranchListItem {
  branchId: number;
  branchName: string;
  isActive: string;
  sNo?: number;
}

export const getBranches = async (): Promise<BranchOption[]> => {
  const { data } = await axiosInstance.get<ApiResponse<BranchListItem[]>>("/Branch/list");
  return (data.data ?? []).map((b) => ({ id: Number(b.branchId), name: b.branchName }));
};

export const categoryService = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getBranches,
} as const;