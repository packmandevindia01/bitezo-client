import axiosInstance from "../../../../api/axiosInstance";
import type { ProviderListItem, ProviderDetail, ProviderPayload, ProviderAccountItem, ProviderPaymodeItem } from "../types";
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

export const fetchProviderPaymodes = async (): Promise<ProviderPaymodeItem[]> => {
  return unwrap(
    axiosInstance.get<ApiResponse<ProviderPaymodeItem[]>>(`${BASE}/paymode-list`)
  );
};






// The backend takes provider create / update as multipart form data, image included
// (the old separate /provider/provider-image upload is gone). Field names are the DTO's PascalCase.
function buildProviderForm(payload: ProviderPayload): FormData {
  const form = new FormData();
  form.append("ProviderName", payload.providerName);
  form.append("PaymodeId", String(payload.paymodeId));
  form.append("PostAccountId", String(payload.postAccountId ?? 0));
  form.append("DeliveryStatus", String(!!payload.deliveryStatus));
  (payload.branchIds || []).forEach((id) => form.append("BranchIds", String(id)));
  // Same as the product master: the backend needs an ImageFile part every time (500 without it),
  // so an empty placeholder goes when no new image was picked.
  form.append(
    "ImageFile",
    payload.imageFile instanceof File
      ? payload.imageFile
      : new File([""], "empty.bin", { type: "application/octet-stream" })
  );
  return form;
}

export const createProvider = async (payload: ProviderPayload): Promise<{ id: number }> => {
  const form = buildProviderForm(payload);
  form.append("CreatedAt", payload.createdAt || new Date().toISOString());
  return unwrap(axiosInstance.post<ApiResponse<{ id: number }>>(BASE, form));
};

/** isImageChanged: a new image was picked, or the saved one was removed (ImageFile is then the empty placeholder). */
export const updateProvider = async (id: number, payload: ProviderPayload): Promise<void> => {
  const form = buildProviderForm(payload);
  form.append("ProviderId", String(id));
  form.append("IsImageChanged", String(!!payload.isImageChanged));
  form.append("UpdatedAt", new Date().toISOString());
  await unwrap(axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${id}`, form));
};



export const deleteProvider = async (id: number): Promise<void> => {
  await unwrap(
    axiosInstance.delete<ApiResponse<unknown>>(`${BASE}/${id}`)
  );
};
