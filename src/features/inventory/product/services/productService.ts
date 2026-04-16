import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  CreateProductPayload,
  ProductDetail,
  ProductListItem,
  ProductMasterData,
  UpdateProductPayload,
} from "../types";

// ─── Base ─────────────────────────────────────────────────────────────────────
//  Must include /api prefix to match the Vite proxy + axiosInstance baseURL setup

const BASE = "/product";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg =
      envelope.errors?.[0]?.message ?? envelope.message ?? "An unexpected error occurred.";
    const err = new Error(msg) as Error & { code?: string; apiStatus?: number };
    err.code = envelope.errors?.[0]?.code;
    err.apiStatus = envelope.status;
    throw err;
  }

  return envelope.data;
}

// ─── Product Service ──────────────────────────────────────────────────────────

export const productService = {
  /** GET /api/product/product-list */
  list(params?: {
    productCode?: string;
    productName?: string;
    categoryId?: number;
    groupId?: number;
  }): Promise<ProductListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<ProductListItem[]>>(`${BASE}/product-list`, { params })
    );
  },

  /** GET /api/product/load_master-data */
  loadMasterData(): Promise<ProductMasterData> {
    return unwrap(
      axiosInstance.get<ApiResponse<ProductMasterData>>(`${BASE}/load_master-data`)
    );
  },

  /** GET /api/product/{productId}/productid-data */
  getById(productId: number): Promise<ProductDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<ProductDetail>>(`${BASE}/${productId}/productid-data`)
    );
  },

  /** POST /api/product */
  create(payload: CreateProductPayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, payload)
    );
  },

  /** PUT /api/product/{productId} */
  update(productId: number, payload: UpdateProductPayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(`${BASE}/${productId}`, payload)
    );
  },

  /** DELETE /api/product/{productId} */
  remove(productId: number): Promise<void> {
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(`${BASE}/${productId}`)
    );
  },
} as const;