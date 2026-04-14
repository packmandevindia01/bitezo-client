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

  const { data } = await axiosInstance.get<ApiResponse<any[]>>(
    "/category/category-list",
    { params }
  );
  return (data.data ?? []).map((item) => ({
    id: item.catId,
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
  payload: CreateCategoryPayload
): Promise<ApiResponse<unknown>> => {
  try {
    const body = {
      ...payload,
      branchIds: payload.branchIds.map((id) => Number(id)),
    };
    const { data } = await axiosInstance.post<ApiResponse<unknown>>("/category", body);
    return data;
  } catch (err: any) {
    const body = err?.response?.data;
    if (body?.errors && typeof body.errors === "object") {
      const detail = Object.entries(body.errors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
        .join(" | ");
      console.error("Create validation errors:", detail);
    } else {
      console.error("Create error body:", JSON.stringify(body, null, 2));
    }
    throw err;
  }
};

export const updateCategory = async (
  id: number,
  payload: UpdateCategoryPayload
): Promise<ApiResponse<unknown>> => {
  const body = {
    ...payload,
    branchIds: payload.branchIds.map((bid) => Number(bid)),
  };
  const { data } = await axiosInstance.put<ApiResponse<unknown>>(
    `/category/${id}`,
    body
  );
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