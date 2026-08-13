import axiosInstance from "../../../../api/axiosInstance";
import type { ProviderListItem, ProviderDetail, ProviderPayload, ProviderAccountItem } from "../types";
import type { ApiResponse } from "../../../inventory/product/types";

const BASE = "/provider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  try {
    const { data: envelope } = await promise;

    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? firstError.message : firstError) 
                  ?? envelope.message 
                  ?? "An unexpected error occurred.";
      throw new Error(msg);
    }

    return envelope.data;
  } catch (error: any) {
    if (error.response?.data) {
      const envelope = error.response.data as ApiResponse<any>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? firstError.message : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
    throw error;
  }
}

// ─── Provider Service ─────────────────────────────────────────────────────────

export const fetchProviders = async (): Promise<ProviderListItem[]> => {
  return unwrap(
    axiosInstance.get<ApiResponse<ProviderListItem[]>>(`${BASE}/provider-list`)
  );
};

export const fetchProviderById = async (id: number): Promise<ProviderDetail> => {
  return unwrap(
    axiosInstance.get<ApiResponse<ProviderDetail>>(`${BASE}/${id}/provider-data`)
  );
};

export const fetchProviderAccounts = async (accountName: string = ""): Promise<ProviderAccountItem[]> => {
  const params = accountName ? `?accountName=${encodeURIComponent(accountName)}` : "";
  return unwrap(
    axiosInstance.get<ApiResponse<ProviderAccountItem[]>>(`${BASE}/account-list${params}`)
  );
};






export const uploadProviderImage = async (id: number, imageFile: File, oldPath: string = "string"): Promise<void> => {
  const formData = new FormData();
  formData.append("ProviderId", String(id));
  formData.append("OldPath", oldPath || "string");
  formData.append("ProviderImage", imageFile);

  await axiosInstance.post("/provider/provider-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const createProvider = async (payload: ProviderPayload): Promise<{id: number}> => {
  const { imageFile, ...jsonData } = payload;
  
  // Remove providerId for create request
  delete jsonData.providerId;

  const response = await unwrap(
    axiosInstance.post<ApiResponse<{ id: number }>>(BASE, {
      ...jsonData,
      createdAt: jsonData.createdAt || new Date().toISOString(),
    })
  );

  if (response?.id && imageFile) {
    await uploadProviderImage(response.id, imageFile);
  }
  
  return response;
};

export const updateProvider = async (id: number, payload: ProviderPayload): Promise<void> => {
  const { imageFile, ...jsonData } = payload;
  const url = `${BASE}/${id}`;

  await unwrap(
    axiosInstance.put<ApiResponse<{ id: number }>>(url, {
      ...jsonData,
      providerId: id,
      updatedAt: new Date().toISOString(),
      createdAt: jsonData.createdAt || new Date().toISOString(),
    })
  );

  if (imageFile) {
    try {
      // For updates, we might need the old path to replace it
      // But the detail response provides fileUrl/filePath
      await uploadProviderImage(id, imageFile);
    } catch (error) {
      console.error("Provider image upload failed:", error);
    }
  }
};



export const deleteProvider = async (id: number): Promise<void> => {
  await unwrap(
    axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${id}`)
  );
};
