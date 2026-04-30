import axiosInstance from "../../../../api/axiosInstance";
import type { LockProductListItem, LockProductPayload, ApiResponse } from "../types";

const BASE = "/lock-product";

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

// ─── Lock Product Service ─────────────────────────────────────────────────────

export const lockProductService = {
  async fetchLockedProducts(productName?: string): Promise<LockProductListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<LockProductListItem[]>>(`${BASE}/lock-product-list`, {
        params: productName ? { productName } : {},
      })
    );
  },

  async lockProduct(payload: LockProductPayload): Promise<void> {
    await unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, payload)
    );
  },

  async updateLockProduct(payload: LockProductPayload): Promise<void> {
    await unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(BASE, payload)
    );
  }
};
