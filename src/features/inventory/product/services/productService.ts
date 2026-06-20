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

const BASE = "/product";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {

  try {
    const { data: envelope } = await promise;

    if (!envelope.isSuccess) {
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? firstError.message : firstError) 
                  ?? envelope.message 
                  ?? "An unexpected error occurred.";
      const err = new Error(msg) as Error & { code?: string; apiStatus?: number };
      err.code = (typeof firstError === 'object' ? firstError.code : undefined);
      err.apiStatus = envelope.status;
      throw err;
    }

    return envelope.data;
  } catch (error: any) {
    const responseData = error.response?.data;
    if (responseData) {
      const envelope = responseData as ApiResponse<any>;
      const firstError = envelope.errors?.[0] as any;
      const msg = (typeof firstError === 'object' ? firstError.message : firstError) 
                  ?? envelope.message 
                  ?? error.message;
      throw new Error(msg);
    }
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
    const finalParams = {
      ...(params || {}),
      clientDb: localStorage.getItem("tenantId") || "",
    };
    return unwrap(
      axiosInstance.get<ApiResponse<ProductListItem[]>>(url, { params: finalParams })
    );
  },

  /** GET /api/product/load_master-data */
  loadMasterData(): Promise<ProductMasterData> {
    const url = `${BASE}/load_master-data`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductMasterData>>(url)
    );
  },

  /** GET /api/product/{productId}/productid-data */
  getById(productId: number): Promise<ProductDetail> {
    const url = `${BASE}/${productId}/productid-data`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductDetail>>(url)
    );
  },

  /** GET /api/product/{productCode}/productcode-data */
  getByCode(productCode: string): Promise<ProductDetail> {
    const url = `${BASE}/${productCode}/productcode-data`;
    return unwrap(
      axiosInstance.get<ApiResponse<ProductDetail>>(url)
    );
  },

  /** GET /api/product/{productCode}/iscode-exist */
  checkCodeExists(productCode: string): Promise<number> {
    const url = `${BASE}/${productCode}/iscode-exist`;
    return unwrap(
      axiosInstance.get<ApiResponse<number>>(url)
    );
  },

  /** POST /api/product */
  async create(payload: CreateProductPayload & { imageFile?: File }): Promise<{ id: number }> {
    const { imageFile, ...jsonData } = payload;
    
    // 1. Create product as JSON
    const data = await unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, jsonData)

    );

    // 2. If an image was provided, upload it separately
    if (imageFile && data.id) {
      try {
        await productService.uploadImage(data.id, imageFile);
      } catch (error) {
        console.error("[ProductService] Image upload failed after creation:", error);
      }
    }

    return data;
  },

  /** PUT /api/product/{productId} */
  async update(productId: number, payload: UpdateProductPayload & { imageFile?: File }): Promise<{ id: number }> {
    const { imageFile, ...jsonData } = payload;
    const url = `${BASE}/${productId}`;

    // 1. Update product as JSON
    const data = await unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(url, jsonData)

    );

    // 2. If a new image was provided, upload it
    if (imageFile) {
      try {
        await productService.uploadImage(productId, imageFile);
      } catch (error) {
        console.error("[ProductService] Image upload failed after update:", error);
      }
    }

    return data;
  },
  
  /** POST /api/product/product-image */
  async uploadImage(productId: number, imageFile: File, oldPath: string = "string"): Promise<void> {
    const url = `${BASE}/product-image`;
    const formData = new FormData();
    // Match Swagger exactly: ProductId, OldPath, ProductImage
    formData.append("ProductId", String(productId));
    formData.append("OldPath", oldPath || "string");
    formData.append("ProductImage", imageFile);

    await axiosInstance.post(url, formData, {
      headers: {
        "Content-Type": undefined,
      },
    });
  },

  /** DELETE /api/product/{productId} */
  remove(productId: number): Promise<void> {
    const url = `${BASE}/${productId}`;
    return unwrap(
      axiosInstance.delete<ApiResponse<void>>(url)

    );
  },

  /** GET /api/product/list_product_name_alt */
  listProductNameAlt(productName: string): Promise<any[]> {
    const url = `${BASE}/list_product_name_alt`;
    return unwrap(
      axiosInstance.get<ApiResponse<any[]>>(url, { params: { productName } })
    );
  },

  /** GET /api/product/list_alt_name */
  listAltNames(productId: number): Promise<any[]> {
    const url = `${BASE}/list_alt_name`;
    return unwrap(
      axiosInstance.get<ApiResponse<any[]>>(url, { params: { productId } })
    );
  },

  /** GET /api/product/list-name */
  listName(productName?: string): Promise<{ productId: number; productName: string }[]> {
    const url = `${BASE}/list-name`;
    return unwrap(
      axiosInstance.get<ApiResponse<{ productId: number; productName: string }[]>>(url, { params: { productName } })
    );
  },
} as const;