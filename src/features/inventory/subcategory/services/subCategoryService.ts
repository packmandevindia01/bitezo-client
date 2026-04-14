import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  CreateSubCategoryPayload,
  SubCategoryListItem,
  UpdateSubCategoryPayload,
} from "../types";

// ── GET List ─────────────────────────────────────────────────────────────────
export const getSubCategories = async (
  code?: string,
  name?: string,
  catId?: number
): Promise<SubCategoryListItem[]> => {
  const params: Record<string, string | number> = {};
  if (code) params.Code = code;
  if (name) params.Name = name;
  if (catId) params.catId = catId;

  const { data } = await axiosInstance.get<ApiResponse<any[]>>(
    "/subcategory/subcategory-list",
    { params }
  );
  
  return (data.data ?? []).map((item) => ({
    id: item.subCatId || item.id,
    code: item.code,
    name: item.name,
    categoryName: item.category || item.categoryName,
    isActive: item.isActive === "Active" || item.isActive === true,
  }));
};

// ── GET By ID (assuming similar pattern to category) ────────────────────────
export const getSubCategoryById = async (id: number): Promise<any> => {
  // If your endpoint differs, modify this URL! Assuming standard subcatid-data.
  const { data } = await axiosInstance.get<ApiResponse<any>>(
    `/subcategory/${id}/subcatid-data`
  );
  return data.data;
};

// ── POST ─────────────────────────────────────────────────────────────────────
export const createSubCategory = async (
  payload: CreateSubCategoryPayload
): Promise<ApiResponse<unknown>> => {
  try {
    const { data } = await axiosInstance.post<ApiResponse<unknown>>("/subcategory", payload);
    return data;
  } catch (err: any) {
    const body = err?.response?.data;
    if (body?.errors && typeof body.errors === "object") {
      const detail = Object.entries(body.errors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
        .join(" | ");
      console.error("Create SubCategory validation errors:", detail);
    } else {
      console.error("Create SubCategory error:", body);
    }
    throw err;
  }
};

// ── PUT ──────────────────────────────────────────────────────────────────────
export const updateSubCategory = async (
  id: number,
  payload: UpdateSubCategoryPayload
): Promise<ApiResponse<unknown>> => {
  try {
    const { data } = await axiosInstance.put<ApiResponse<unknown>>(
      `/subcategory/${id}`,
      payload
    );
    return data;
  } catch (err: any) {
    const body = err?.response?.data;
    if (body?.errors && typeof body.errors === "object") {
      const detail = Object.entries(body.errors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
        .join(" | ");
      console.error("Update SubCategory validation errors:", detail);
    }
    throw err;
  }
};

// ── DELETE ───────────────────────────────────────────────────────────────────
export const deleteSubCategory = async (id: number): Promise<ApiResponse<unknown>> => {
  const { data } = await axiosInstance.delete<ApiResponse<unknown>>(`/subcategory/${id}`);
  return data;
};

export const subCategoryService = {
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} as const;
