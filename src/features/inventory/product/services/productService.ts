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
  try {
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
  } catch (error: any) {
    const responseData = error.response?.data;
    if (error.response?.status === 400 && responseData?.errors) {
      console.error(`[ProductAPI Validation Errors] ${url}:`, responseData.errors);
    }
    console.error(`[ProductAPI Error] ${url}:`, {
      message: error.message,
      status: error.response?.status,
      data: responseData,
    });
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
  async create(payload: CreateProductPayload & { imageFile?: File }): Promise<{ id: number }> {
    const { imageFile, ...data } = payload;
    
    // 1. Create product as JSON (application/json)
    const result = await unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, data),
      BASE
    );

    // 2. If an image was provided, upload it separately to /api/product/product-image
    if (imageFile && result.id) {
      try {
        await productService.uploadImage(result.id, imageFile);
      } catch (error) {
        console.error("[ProductService] Image upload failed after product creation:", error);
      }
    }

    return result;
  },

  /** PUT /api/product/{productId} - Update product details as JSON */
  async update(productId: number, payload: UpdateProductPayload & { imageFile?: File }): Promise<{ id: number }> {
    const { imageFile, ...data } = payload;
    const url = `${BASE}/${productId}`;

    // 1. Update product as JSON
    const result = await unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(url, data),
      url
    );

    // 2. If a new image was provided, upload it
    if (imageFile) {
      try {
        await productService.uploadImage(productId, imageFile);
      } catch (error) {
        console.error("[ProductService] Image upload failed after product update:", error);
      }
    }

    return result;
  },
  
  /** POST /api/product/product-image */
  async uploadImage(productId: number, imageFile: File): Promise<void> {
    const url = `${BASE}/product-image`;
    const formData = new FormData();
    // Some APIs expect camelCase even if Swagger shows PascalCase
    formData.append("productId", String(productId));
    formData.append("productImage", imageFile);

    return unwrap(
      axiosInstance.post<ApiResponse<void>>(url, formData),
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