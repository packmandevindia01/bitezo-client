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
    branchId?: number;
  }): Promise<ProductListItem[]> {
    const url = `${BASE}/product-list`;
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode
      ? Number(sessionStorage.getItem("backoffice_activeBranchId")) || null
      : Number(localStorage.getItem("activeBranchId")) || null;

    const finalBranchId = params?.branchId ?? (activeBranchId || undefined);

    const finalParams = {
      ...(params || {}),
      ...(finalBranchId ? { branchId: finalBranchId } : {}),
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

  /** POST /api/v1/product */
  async create(payload: CreateProductPayload): Promise<{ id: number }> {
    const formData = new FormData();
    formData.append("Code", payload.code || "");
    formData.append("Barcode", payload.barcode || "");
    formData.append("Name", payload.name || "");
    formData.append("ArabicName", payload.arabicName || "");
    formData.append("CategoryId", String(Number(payload.categoryId) || 0));
    formData.append("SubCatId", String(Number(payload.subCatId) || 0));
    formData.append("GroupId", String(Number(payload.groupId) || 0));
    formData.append("TypeId", String(Number(payload.typeId) || 0));
    formData.append("UnitId", String(Number(payload.unitId) || 0));
    formData.append("PVatId", String(Number(payload.pVatId) || 0));
    formData.append("SVatId", String(Number(payload.sVatId) || 0));
    formData.append("Cost", String(Number(payload.cost) || 0));
    formData.append("Price", String(Number(payload.price) || 0));
    formData.append("PriceIsIncl", String(Boolean(payload.priceIsIncl)));
    formData.append("BranchId", String(Number(payload.branchId) || 0));
    formData.append("IsActive", String(Boolean(payload.isActive)));
    formData.append("ColorCode", payload.colorCode || "#49293e");
    formData.append("CreatedAt", payload.createdAt || new Date().toISOString());

    if (payload.imageFile instanceof File) {
      formData.append("ImageFile", payload.imageFile);
    } else {
      const dummyFile = new File([""], "empty.bin", { type: "application/octet-stream" });
      formData.append("ImageFile", dummyFile);
    }

    const altList = Array.isArray(payload.altProducts)
      ? payload.altProducts.map(a => ({
          unitId: Number(a.unitId) || 0,
          barcode: a.barcode || "",
          isIncl: Boolean(a.isIncl),
          price: Number(a.price) || 0,
          altName: a.altName || "",
          altArabic: a.altArabic || "",
          branchId: Number(a.branchId) || 0,
        }))
      : [];
    formData.append("AltProductsJson", JSON.stringify(altList));

    const colorList = Array.isArray(payload.productColors)
      ? payload.productColors.map(c => ({
          branchId: Number(c.branchId) || 0,
          colorCode: c.colorCode || "#49293e",
        }))
      : [];
    formData.append("ProductColorsJson", JSON.stringify(colorList));

    const stockList = Array.isArray(payload.openingStocks)
      ? payload.openingStocks.map(o => ({
          unitId: Number(o.unitId) || 0,
          qty: Number(o.qty) || 0,
          cost: Number(o.cost) || 0,
          amount: Number(o.amount) || ((Number(o.qty) || 0) * (Number(o.cost) || 0)),
          baseQty: Number(o.baseQty) || Number(o.qty) || 0,
          branchId: Number(o.branchId) || 0,
        }))
      : [];
    formData.append("OpeningStocksJson", JSON.stringify(stockList));

    console.group("[productService] POST /product Create Payload");
    console.log("Original Payload Object:", payload);
    const createDataSummary: Record<string, any> = {};
    for (const [key, value] of (formData as any).entries()) {
      createDataSummary[key] = value instanceof File ? `File (name: ${value.name}, size: ${value.size}B)` : value;
    }
    console.table(createDataSummary);
    console.groupEnd();

    const data = await unwrap(
      axiosInstance.post<ApiResponse<{ id: number }>>(BASE, formData)
    );

    return data;
  },

  /** PUT /api/v1/product/{productId} */
  async update(productId: number, payload: UpdateProductPayload): Promise<{ id: number }> {
    const formData = new FormData();
    formData.append("ProductId", String(productId));
    formData.append("Code", payload.code || "");
    formData.append("Barcode", payload.barcode || "");
    formData.append("Name", payload.name || "");
    formData.append("ArabicName", payload.arabicName || "");
    formData.append("CategoryId", String(Number(payload.categoryId) || 0));
    formData.append("SubCatId", String(Number(payload.subCatId) || 0));
    formData.append("GroupId", String(Number(payload.groupId) || 0));
    formData.append("TypeId", String(Number(payload.typeId) || 0));
    formData.append("UnitId", String(Number(payload.unitId) || 0));
    formData.append("PVatId", String(Number(payload.pVatId) || 0));
    formData.append("SVatId", String(Number(payload.sVatId) || 0));
    formData.append("Cost", String(Number(payload.cost) || 0));
    formData.append("Price", String(Number(payload.price) || 0));
    formData.append("PriceIsIncl", String(Boolean(payload.priceIsIncl)));
    formData.append("BranchId", String(Number(payload.branchId) || 0));
    formData.append("IsActive", String(Boolean(payload.isActive)));
    formData.append("ColorCode", payload.colorCode || "#49293e");

    const isImageChanged = Boolean(payload.isImageChanged ?? payload.isImageChaged ?? false);
    formData.append("IsImageChanged", String(isImageChanged));
    formData.append("IsImageChaged", String(isImageChanged));
    formData.append("updatedAt", payload.updatedAt || new Date().toISOString());
    formData.append("UpdatedAt", payload.updatedAt || new Date().toISOString());

    if (isImageChanged && payload.imageFile instanceof File) {
      formData.append("ImageFile", payload.imageFile);
    } else {
      // Backend model binder expects ImageFile part in multipart/form-data even when unchanged
      const dummyFile = new File([""], "empty.bin", { type: "application/octet-stream" });
      formData.append("ImageFile", dummyFile);
    }

    const altList = Array.isArray(payload.altProducts)
      ? payload.altProducts.map(a => ({
          unitId: Number(a.unitId) || 0,
          barcode: a.barcode || "",
          isIncl: Boolean(a.isIncl),
          price: Number(a.price) || 0,
          altName: a.altName || "",
          altArabic: a.altArabic || "",
          branchId: Number(a.branchId) || 0,
        }))
      : [];
    formData.append("AltProductsJson", JSON.stringify(altList));

    const colorList = Array.isArray(payload.productColors)
      ? payload.productColors.map(c => ({
          branchId: Number(c.branchId) || 0,
          colorCode: c.colorCode || "#49293e",
        }))
      : [];
    formData.append("ProductColorsJson", JSON.stringify(colorList));

    const stockList = Array.isArray(payload.openingStocks)
      ? payload.openingStocks.map(o => ({
          unitId: Number(o.unitId) || 0,
          qty: Number(o.qty) || 0,
          cost: Number(o.cost) || 0,
          amount: Number(o.amount) || ((Number(o.qty) || 0) * (Number(o.cost) || 0)),
          baseQty: Number(o.baseQty) || Number(o.qty) || 0,
          branchId: Number(o.branchId) || 0,
        }))
      : [];
    formData.append("OpeningStocksJson", JSON.stringify(stockList));

    console.group(`[productService] PUT /product/${productId} Update Payload`);
    console.log("Original Payload Object:", payload);
    const updateDataSummary: Record<string, any> = {};
    for (const [key, value] of (formData as any).entries()) {
      updateDataSummary[key] = value instanceof File ? `File (name: ${value.name}, size: ${value.size}B)` : value;
    }
    console.table(updateDataSummary);
    console.groupEnd();

    const url = `${BASE}/${productId}`;
    const data = await unwrap(
      axiosInstance.put<ApiResponse<{ id: number }>>(url, formData)
    );

    return data;
  },
  
  /** DELETE /api/product/{productId} */
  async delete(productId: number): Promise<void> {
    const url = `${BASE}/${productId}`;
    await unwrap(
      axiosInstance.delete<ApiResponse<void>>(url)
    );
  },

  /** POST /api/product/product-image (legacy helper) */
  async uploadImage(productId: number, imageFile?: File, oldPath: string = "string"): Promise<void> {
    const url = `${BASE}/product-image`;
    const formData = new FormData();
    formData.append("ProductId", String(productId));
    formData.append("OldPath", oldPath || "string");
    if (imageFile) {
      formData.append("ProductImage", imageFile);
    }

    try {
      await axiosInstance.post(url, formData);
    } catch (e) {
      console.warn("[productService] legacy uploadImage failed, ignoring:", e);
    }
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