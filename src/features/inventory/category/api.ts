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
      console.error("[categoryApi] API reported failure:", JSON.stringify(envelope, null, 2));
      let msg: string | undefined;
      if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
        const firstError = envelope.errors[0] as any;
        msg = typeof firstError === 'object'
          ? (firstError.message || firstError.description || firstError.error || firstError.detail || firstError.field || JSON.stringify(firstError))
          : String(firstError);
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
      console.error("[categoryApi] Server error status:", error.response.status);
      console.error("[categoryApi] Server error payload:", JSON.stringify(error.response.data, null, 2));
      const envelope = error.response.data as any;
      let msg: string | undefined;
      if (Array.isArray(envelope.errors) && envelope.errors.length > 0) {
        const firstError = envelope.errors[0] as any;
        msg = typeof firstError === 'object'
          ? (firstError.message || firstError.description || firstError.error || firstError.detail || firstError.field || JSON.stringify(firstError))
          : String(firstError);
      } else if (envelope.errors && typeof envelope.errors === 'object') {
        const entries = Object.entries(envelope.errors);
        if (entries.length > 0) {
          const [field, msgs] = entries[0] as [string, any];
          const firstMsg = Array.isArray(msgs) ? msgs[0] : String(msgs);
          msg = firstMsg ? `${field ? field + ": " : ""}${firstMsg}` : undefined;
        }
      }
      throw new Error(msg || envelope.message || envelope.title || error.message);
    }
    throw error;
  }
}

// ── Category endpoints ────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────────

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
    id: item.catId ?? item.id,
    code: item.catCode ?? item.code,
    name: item.catName ?? item.name,
    isActive: item.isActive === "Active" || item.isActive === true,
    arabic: item.arabic || "",
    colorCode: item.colorCode || "red",
    imageUrl: item.imageUrl || item.imagePath || item.categoryImage || item.fileUrl || item.filePath || item.image || "",
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
  payload: CreateCategoryPayload
): Promise<ApiResponse<{ id: number }>> => {
  const formData = new FormData();
  formData.append("Code", payload.code || "");
  formData.append("Name", payload.name || "");
  formData.append("Arabic", payload.arabic || "");
  formData.append("IsActive", String(payload.isActive ?? true));
  formData.append("ColorCode", payload.colorCode || "red");
  formData.append("PosStatus", String(payload.posStatus ?? true));
  formData.append("CreatedAt", payload.createdAt || new Date().toISOString());

  if (payload.imageFile instanceof File) {
    formData.append("ImageFile", payload.imageFile);
  } else {
    const dummyFile = new File([""], "empty.bin", { type: "application/octet-stream" });
    formData.append("ImageFile", dummyFile);
  }

  const branchList = Array.isArray(payload.branchIds)
    ? payload.branchIds.map((branch) => ({
        branchId: Number(branch.branchId),
        colorCode: branch.colorCode || "red",
      }))
    : [];
  formData.append("BranchIdsJson", JSON.stringify(branchList));

  if (Array.isArray(payload.menuIds) && payload.menuIds.length > 0) {
    payload.menuIds.forEach((menuId, idx) => {
      formData.append("MenuIds", String(menuId));
      formData.append(`MenuIds[${idx}]`, String(menuId));
      formData.append(`menuIds[${idx}]`, String(menuId));
    });
    formData.append("MenuIdsJson", JSON.stringify(payload.menuIds));
  }

  // Detailed Console Logging for Create Category
  console.group("[categoryApi] POST /category Create Payload");
  console.log("Original Payload Object:", payload);
  const createDataSummary: Record<string, any> = {};
  for (const [key, value] of (formData as any).entries()) {
    createDataSummary[key] = value instanceof File ? `File (name: ${value.name}, size: ${value.size}B)` : value;
  }
  console.table(createDataSummary);
  console.groupEnd();

  const data = await unwrap(
    axiosInstance.post<ApiResponse<{ id: number }>>("/category", formData)
  );
  
  return {
    data,
    isSuccess: true,
    message: "Category created successfully",
    status: 200,
    correlationId: "",
    errors: []
  };
};

export const updateCategory = async (
  id: number,
  payload: UpdateCategoryPayload
): Promise<ApiResponse<{ id: number }>> => {
  const formData = new FormData();
  formData.append("Id", String(id));
  formData.append("Code", payload.code || "");
  formData.append("Name", payload.name || "");
  formData.append("Arabic", payload.arabic || "");
  formData.append("IsActive", String(payload.isActive ?? true));
  formData.append("ColorCode", payload.colorCode || "red");
  formData.append("PosStatus", String(payload.posStatus ?? true));
  formData.append("UpdatedAt", payload.updatedAt || new Date().toISOString());
  
  const isImageChanged = Boolean(payload.isImageChanged ?? payload.isImageChaged ?? false);
  formData.append("IsImageChanged", String(isImageChanged));
  formData.append("IsImageChaged", String(isImageChanged));

  if (isImageChanged && payload.imageFile instanceof File) {
    formData.append("ImageFile", payload.imageFile);
  } else {
    // Backend model binder requires an ImageFile part in multipart/form-data even when IsImageChanged=false
    const dummyFile = new File([""], "empty.bin", { type: "application/octet-stream" });
    formData.append("ImageFile", dummyFile);
  }

  const branchList = Array.isArray(payload.branchIds)
    ? payload.branchIds.map((branch) => ({
        branchId: Number(branch.branchId),
        colorCode: branch.colorCode || "red",
      }))
    : [];
  formData.append("BranchIdsJson", JSON.stringify(branchList));

  if (Array.isArray(payload.menuIds) && payload.menuIds.length > 0) {
    payload.menuIds.forEach((menuId, idx) => {
      formData.append("MenuIds", String(menuId));
      formData.append(`MenuIds[${idx}]`, String(menuId));
      formData.append(`menuIds[${idx}]`, String(menuId));
    });
    formData.append("MenuIdsJson", JSON.stringify(payload.menuIds));
  }

  // Detailed Console Logging for Update Category
  console.group(`[categoryApi] PUT /category/${id} Update Payload`);
  console.log("Original Payload Object:", payload);
  const formDataSummary: Record<string, any> = {};
  for (const [key, value] of (formData as any).entries()) {
    formDataSummary[key] = value instanceof File ? `File (name: ${value.name}, size: ${value.size}B)` : value;
  }
  console.table(formDataSummary);
  console.groupEnd();

  const url = `/category/${id}`;
  const data = await unwrap(
    axiosInstance.put<ApiResponse<{ id: number }>>(url, formData)
  );
  
  return {
    data,
    isSuccess: true,
    message: "Category updated successfully",
    status: 200,
    correlationId: "",
    errors: []
  };
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
