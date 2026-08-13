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

    if (envelope && envelope.isSuccess === false) {
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
      console.error("================ API ERROR RESPONSE ================");
      console.error("HTTP Status:", error.response?.status);
      console.error("Raw Error Body:", JSON.stringify(responseData, null, 2));
      if (responseData.errors) {
        console.error("Validation Errors:", responseData.errors);
        
        let errorMessages: string[] = [];
        if (Array.isArray(responseData.errors)) {
          errorMessages = responseData.errors.map((err: any) => {
            if (typeof err === 'string') return err;
            if (typeof err === 'object' && err !== null && err.message) return err.message;
            return JSON.stringify(err);
          });
        } else if (typeof responseData.errors === 'object' && responseData.errors !== null) {
          errorMessages = Object.entries(responseData.errors).map(([field, msgs]) => 
            `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
          );
        } else {
          errorMessages = [String(responseData.errors)];
        }
        
        const finalMessage = errorMessages.length > 0 && errorMessages[0] !== "{}" 
          ? errorMessages.join(' | ') 
          : responseData.message || "Unknown validation error";
          
        throw new Error(`API Validation Error (${error.response?.status}): ${finalMessage}`);
      }
      const msg = responseData.title || responseData.message || error.message;
      throw new Error(msg);
    }
    console.error("[productService] Request failed:", error);
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

  /** GET /api/product/next-barcode */
  getNextBarcode: async (): Promise<string> => {
    const url = `${BASE}/next-barcode`;
    const response = await unwrap(
      axiosInstance.get<ApiResponse<{ barcode: string }>>(url)
    );
    return response.barcode;
  },

  /** POST /api/product */
  async create(payload: CreateProductPayload & { imageFile?: File }): Promise<{ id: number }> {
    const { imageFile, ...jsonData } = payload;
    
    // 1. Create product as JSON
    const data = await unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, jsonData)
    );

    const createdId = (data as any)?.id || (data as any)?.productId || (typeof data === "number" ? data : 0);

    // 2. Upload image sequentially right after product is created
    if (imageFile && createdId) {
      try {
        await productService.uploadImage(createdId, imageFile, "string");
      } catch (error: any) {
        console.error("[ProductService] Image upload failed after creation:", error);
        throw new Error(error.message ? `Product created, but image upload failed: ${error.message}` : "Product created, but image upload failed.");
      }
    }

    return data;
  },

  /** PUT /api/product/{productId} */
  async update(productId: number, payload: UpdateProductPayload & { imageFile?: File; oldPath?: string }): Promise<{ id: number }> {
    const { imageFile, oldPath, ...jsonData } = payload;
    const url = `${BASE}/${productId}`;

    // 1. Update product as JSON
    const data = await unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(url, jsonData)
    );

    // 2. Upload new image sequentially right after product is updated
    if (imageFile) {
      try {
        await productService.uploadImage(productId, imageFile, oldPath || "string");
      } catch (error: any) {
        console.error("[ProductService] Image upload failed after update:", error);
        throw new Error(error.message ? `Product updated, but image upload failed: ${error.message}` : "Product updated, but image upload failed.");
      }
    }

    return data;
  },
  
  /** DELETE /api/product/{productId} */
  async delete(productId: number): Promise<void> {
    const url = `${BASE}/${productId}`;
    await unwrap(
      axiosInstance.delete<ApiResponse<void>>(url)
    );
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
        "Content-Type": "multipart/form-data"
      }
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

  /** GET /api/product/closing-stock/{productId}/{branchId} */
  getClosingStock(productId: number, branchId: number): Promise<{ stock: string }> {
    const url = `${BASE}/closing-stock/${productId}/${branchId}`;
    return unwrap(axiosInstance.get<ApiResponse<{ stock: string }>>(url));
  },

  /** GET /api/product/average-cost/{productId}/{unitId}/{branchId} */
  getAverageCost(productId: number, unitId: number, branchId: number): Promise<{ avgCost: number }> {
    const url = `${BASE}/average-cost/${productId}/${unitId}/${branchId}`;
    return unwrap(axiosInstance.get<ApiResponse<{ avgCost: number }>>(url));
  },
} as const;