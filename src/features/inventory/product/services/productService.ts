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

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>, url: string): Promise<T> {
  console.log(`[ProductAPI Request] ${url}`);
  try {
    const { data: envelope } = await promise;
    console.log(`[ProductAPI Response] ${url}:`, envelope);

    if (!envelope.isSuccess) {
      const msg =
        envelope.errors?.[0]?.message ?? envelope.message ?? "An unexpected error occurred.";
      const err = new Error(msg) as Error & { code?: string; apiStatus?: number };
      err.code = envelope.errors?.[0]?.code;
      err.apiStatus = envelope.status;
      throw err;
    }

    return envelope.data;
  } catch (error) {
    console.error(`[ProductAPI Error] ${url}:`, error);
    throw error;
  }
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
    const url = `${BASE}/product-list`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductListItem[]>>(url, { params }),
      url
    );
  },

  /** GET /api/product/load_master-data */
  loadMasterData(): Promise<ProductMasterData> {
    const url = `${BASE}/load_master-data`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductMasterData>>(url),
      url
    );
  },

  /** GET /api/product/{productId}/productid-data */
  getById(productId: number): Promise<ProductDetail> {
    const url = `${BASE}/${productId}/productid-data`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductDetail>>(url),
      url
    );
  },

  /** GET /api/product/{productCode}/productcode-data */
  getByCode(productCode: string): Promise<ProductDetail> {
    const url = `${BASE}/${productCode}/productcode-data`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductDetail>>(url),
      url
    );
  },

  /** GET /api/product/{productCode}/iscode-exist */
  checkCodeExists(productCode: string): Promise<number> {
    const url = `${BASE}/${productCode}/iscode-exist`;
    return unwrap(
      axiosInstance.get<ApiResponse<number>>(url),
      url
    );
  },

  /** POST /api/product */
  create(payload: CreateProductPayload): Promise<{ id: number }> {
    return unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, payload),
      BASE
    );
  },

  /** PUT /api/product/{productId} */
  update(productId: number, payload: UpdateProductPayload): Promise<{ id: number }> {
    const url = `${BASE}/${productId}`;
    return unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(url, payload),
      url
    );
  },

  /** DELETE /api/product/{productId} */
  remove(productId: number): Promise<void> {
    const url = `${BASE}/${productId}`;
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(url),
      url
    );
  },
} as const;