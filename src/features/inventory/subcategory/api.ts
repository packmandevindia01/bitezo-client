import axiosInstance from "../../../api/axiosInstance";
import type {
  ApiResponse,
  CreateSubCategoryPayload,
  SubCategoryListItem,
  UpdateSubCategoryPayload,
} from "./types";

// --- Helpers -----------------------------------------------------------------

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;

    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.field || firstError.message) : firstError) 
                  ?? envelope.message 
                  ?? "An unexpected error occurred.";
      throw new Error(msg);
    }

    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as ApiResponse<any>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? (firstError.field || firstError.message) : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
    throw error;
  }
}

// --- Sub Category endpoints --------------------------------------------------

export const getSubCategories = async (
  code?: string,
  name?: string,
  catId?: number
): Promise<SubCategoryListItem[]> => {
  const params: Record<string, string | number> = {};
  if (code) params.Code = code;
  if (name) params.Name = name;
  if (catId) params.catId = catId;

  const data = await unwrap(
    axiosInstance.get<ApiResponse<SubCategoryListItem[]>>("/subcategory/subcategory-list", { params })
  );
  
  return ((data as any[]) ?? []).map((item) => ({
    id: item.subCatId || item.id,
    code: item.code,
    name: item.name,
    arabicName: item.arabicName || item.arabic || "",
    categoryName: item.category || item.categoryName,
    categoryId: item.categoryId || item.catId,
    isActive: item.isActive === "Active" || item.isActive === true,
  }));
};

export const getSubCategoryById = async (id: number): Promise<SubCategoryListItem> => {
  return unwrap(
    axiosInstance.get<ApiResponse<SubCategoryListItem>>(`/subcategory/${id}/subcatid-data`)
  );
};

export const uploadSubCategoryImage = async (id: number, imageFile: File, oldPath: string = "string"): Promise<void> => {
  const formData = new FormData();
  formData.append("Id", String(id));
  formData.append("OldPath", oldPath || "string");
  formData.append("SubCategoryImage", imageFile);

  await axiosInstance.post("/subcategory/subcategory-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const createSubCategory = async (
  payload: CreateSubCategoryPayload & { imageFile?: File }
): Promise<ApiResponse<{ id: number }>> => {
  const { imageFile, ...jsonData } = payload;
  
  const data = await unwrap(
    axiosInstance.post<ApiResponse<{ id: number }>>("/subcategory", jsonData)
  );

  const response: ApiResponse<{ id: number }> = {
    data,
    isSuccess: true,
    message: "Sub Category created successfully",
    status: 200,
    correlationId: "",
    errors: []
  };

  if ((data as any)?.id && imageFile) {
    try {
      await uploadSubCategoryImage((data as any).id, imageFile);
    } catch (error) {
      console.error("Sub Category image upload failed:", error);
    }
  }

  return response;
};

export const updateSubCategory = async (
  id: number,
  payload: UpdateSubCategoryPayload & { imageFile?: File }
): Promise<ApiResponse<{ id: number }>> => {
  const { imageFile, ...jsonData } = payload;
  
  const data = await unwrap(
    axiosInstance.put<ApiResponse<{ id: number }>>(`/subcategory/${id}`, jsonData)
  );

  const response: ApiResponse<{ id: number }> = {
    data,
    isSuccess: true,
    message: "Sub Category updated successfully",
    status: 200,
    correlationId: "",
    errors: []
  };

  if (imageFile) {
    try {
      await uploadSubCategoryImage(id, imageFile);
    } catch (error) {
      console.error("Sub Category image upload failed:", error);
    }
  }

  return response;
};

export const deleteSubCategory = async (id: number): Promise<unknown> => {
  return unwrap(
    axiosInstance.delete<ApiResponse<unknown>>(`/subcategory/${id}`)
  );
};

export const subCategoryApi = {
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  uploadSubCategoryImage,
} as const;

