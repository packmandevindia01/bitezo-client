import axiosInstance from "../../../api/axiosInstance";
import type {
  ApiResponse,
  BranchOption,
  CategoryDetailResponse,
  CategoryListItem,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "./types";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;

    if (!envelope.isSuccess) {
      let msg: string | undefined;
      if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
        const firstError = envelope.errors[0] as any;
        msg = typeof firstError === 'object' ? (firstError.message || firstError.field) : firstError;
      } else if (envelope.errors && typeof envelope.errors === 'object') {
        const entries = Object.entries(envelope.errors);
        if (entries.length > 0) {
          const [field, msgs] = entries[0] as [string, any];
          const firstMsg = Array.isArray(msgs) ? msgs[0] : String(msgs);
          msg = firstMsg ? `${field ? field + ": " : ""}${firstMsg}` : undefined;
        }
      }
      throw new Error(msg || envelope.message || "An unexpected error occurred.");
    }

    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as any;
      let msg: string | undefined;
      if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
        const firstError = envelope.errors[0] as any;
        msg = typeof firstError === 'object' ? (firstError.message || firstError.field) : firstError;
      } else if (envelope.errors && typeof envelope.errors === 'object') {
        const entries = Object.entries(envelope.errors);
        if (entries.length > 0) {
          const [field, msgs] = entries[0] as [string, any];
          const firstMsg = Array.isArray(msgs) ? msgs[0] : String(msgs);
          msg = firstMsg ? `${field ? field + ": " : ""}${firstMsg}` : undefined;
        }
      }
      throw new Error(msg || envelope.message || error.message);
    }
    throw error;
  }
}

// â”€â”€ Category endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ──────────────────────────────────────────────────────────────────────────────────────────────────

export const getCategories = async (
  catCode?: string,
  catName?: string
): Promise<CategoryListItem[]> => {
  const params: Record<string, string> = {};
  if (catCode) params.catCode = catCode;
  if (catName) params.catName = catName;

  const data = await unwrap(
    axiosInstance.get<ApiResponse<CategoryListItem[]>>("/category/category-list", { params })
  );
  
  return ((data as any[]) ?? []).map((item: any) => ({
    id: item.catId,
    code: item.catCode,
    name: item.catName,
    isActive: item.isActive === "Active" || item.isActive === true,
    arabic: item.arabic || "",
    colorCode: item.colorCode || "red",
    branches: [],
  }));
};

export const getNextCategoryCode = async (): Promise<string> => {
  const data = await unwrap(
    axiosInstance.get<ApiResponse<{ code: number }>>("/category/next-category-code")
  );
  return data.code.toString();
};

export const getCategoryById = async (id: number): Promise<CategoryDetailResponse["data"]> => {
  return unwrap(
    axiosInstance.get<CategoryDetailResponse>(`/category/${id}/catid-data`)
  );
};

export const uploadCategoryImage = async (id: number, imageFile: File, oldPath: string = "string"): Promise<void> => {
  const formData = new FormData();
  formData.append("Id", String(id));
  formData.append("OldPath", oldPath || "string");
  formData.append("CategoryImage", imageFile);

  await axiosInstance.post("/category/category-image", formData);
};

export const createCategory = async (
  payload: CreateCategoryPayload & { imageFile?: File }
): Promise<ApiResponse<{ id: number }>> => {
  const { imageFile, ...jsonData } = payload;
  
  // 1. Create category as JSON
  const data = await unwrap(
    axiosInstance.post<ApiResponse<{ id: number }>>("/category", jsonData)
  );
  
  const response: ApiResponse<{ id: number }> = {
    data,
    isSuccess: true,
    message: "Category created successfully",
    status: 200,
    correlationId: "",
    errors: []
  };

  // 2. If image exists, upload it
  if ((data as any)?.id && imageFile) {
    try {
      await uploadCategoryImage((data as any).id, imageFile);
    } catch (error) {
      console.error("Category image upload failed:", error);
    }
  }
  
  return response;
};

export const updateCategory = async (
  id: number,
  payload: UpdateCategoryPayload & { imageFile?: File }
): Promise<ApiResponse<{ id: number }>> => {
  const { imageFile, ...jsonData } = payload;
  const url = `/category/${id}`;
  
  // 1. Update category as JSON
  const data = await unwrap(
    axiosInstance.put<ApiResponse<{ id: number }>>(url, jsonData)
  );
  
  const response: ApiResponse<{ id: number }> = {
    data,
    isSuccess: true,
    message: "Category updated successfully",
    status: 200,
    correlationId: "",
    errors: []
  };

  // 2. If image exists, upload it
  if (imageFile) {
    try {
      await uploadCategoryImage(id, imageFile);
    } catch (error) {
      console.error("Category image upload failed:", error);
    }
  }
  
  return response;
};

export const deleteCategory = async (id: number): Promise<unknown> => {
  return unwrap(
    axiosInstance.delete<ApiResponse<unknown>>(`/category/${id}`)
  );
};

// â”€â”€ Branch endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface BranchListItem {
  branchId: number;
  branchName: string;
  isActive: string;
  sNo?: number;
}

export const getBranches = async (): Promise<BranchOption[]> => {
  const data = await unwrap(
    axiosInstance.get<ApiResponse<BranchListItem[]>>("/Branch/list")
  );
  return ((data as any[]) ?? []).map((b: any) => ({ id: Number(b.branchId), name: b.branchName }));
};

export const categoryApi = {
  getCategories,
  getNextCategoryCode,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getBranches,
  uploadCategoryImage,
  
  /** GET /api/category/list-name */
  listName: async (catName?: string): Promise<{ catId: number; catName: string }[]> => {
    return unwrap(
      axiosInstance.get<ApiResponse<{ catId: number; catName: string }[]>>("/category/list-name", { params: { catName } })
    );
  },
} as const;
