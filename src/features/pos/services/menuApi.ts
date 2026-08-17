import axiosInstance from "../../../api/axiosInstance";
import type { 
  PosCategory, 
  MenuSubCategory, 
  PosProduct, 
  MenuMasterData,
  PosAlternative,
  PosOrderType
} from "../types";

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
}

const unwrap = <T>(promise: Promise<{ data: ApiResponse<T> }>) => 
  promise.then(res => {
    if (res.data && res.data.isSuccess === false) throw new Error(res.data.message);
    return (res.data?.data !== undefined ? res.data.data : res.data) as T;
  });

const getTenantQuery = () => {
  const tenantId = localStorage.getItem("tenantId") || "";
  return `?clientDb=${tenantId}`;
};

const getProviderOwnStatus = (orderTypeId?: number) => {
  try {
    const saved = localStorage.getItem('posConfigs');
    const full = saved ? JSON.parse(saved) : {};
    const val = full?.configs?.providerOwnStatus ?? 
                full?.configs?.providerOwnMenuStatus ?? 
                full?.configs?.ProviderOwnStatus;
    if (val !== undefined && val !== null) {
      return val === true || val === "Enable" || val === "true" || val === 1;
    }
    if (orderTypeId && orderTypeId > 4) {
      return true;
    }
    return true;
  } catch {
    return true;
  }
};

export const menuApi = {
  /** GET /api/menu/master-data */
  getMasterData: async () => {
    // Format as HH:mm:ss for .NET TimeSpan binding
    const now = new Date();
    const timeSpanString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const [raw, allCategoriesRes] = await Promise.all([
      unwrap(axiosInstance.get<ApiResponse<any>>(`/menu/master-data`, {
        params: {
          clientDb: localStorage.getItem("tenantId") || "",
          currentTime: timeSpanString
        }
      })),
      axiosInstance.get<ApiResponse<any[]>>(`/category/category-list`, {
        params: { clientDb: localStorage.getItem("tenantId") || "" }
      }).then(r => (Array.isArray(r.data?.data) ? r.data.data : (Array.isArray(r.data) ? r.data : []))).catch(() => [])
    ]);

    const rawMenu = raw.menu ?? raw.groups ?? raw.group ?? [];
    const menu = rawMenu.map((m: any) => ({
      menuId: m.menuId ?? m.groupId ?? 0,
      menuName: m.menuName ?? m.groupName ?? "",
      arabicName: m.arabicName ?? "",
    }));
    const legacyGroup = rawMenu.map((m: any) => ({
      groupId: m.menuId ?? m.groupId ?? 0,
      groupName: m.menuName ?? m.groupName ?? "",
      arabicName: m.arabicName ?? "",
    }));

    const masterCategories = Array.isArray(raw.categories ?? raw.category) ? (raw.categories ?? raw.category) : [];
    const allCatList = Array.isArray(allCategoriesRes) ? allCategoriesRes : [];

    // Map all categories from database (ensuring unassigned categories are always available)
    const categoryMap = new Map<number, PosCategory>();

    allCatList.forEach((c: any) => {
      const id = Number(c.catId ?? c.categoryId ?? c.id ?? 0);
      if (id > 0) {
        categoryMap.set(id, {
          id,
          name: String(c.catName ?? c.categoryName ?? c.name ?? ""),
          arabicName: String(c.arabic ?? c.arabicName ?? ""),
          imageUrl: c.imageUrl ?? null,
          colorCode: c.colorCode || "red",
        });
      }
    });

    masterCategories.forEach((c: any) => {
      const id = Number(c.categoryId ?? c.id ?? 0);
      if (id > 0) {
        categoryMap.set(id, {
          id,
          name: String(c.categoryName ?? c.name ?? ""),
          arabicName: String(c.arabicName ?? c.arabic ?? ""),
          imageUrl: c.imageUrl ?? null,
          colorCode: c.colorCode || "red"
        });
      }
    });

    const categories = Array.from(categoryMap.values());
    const orderTypes = raw.orderTypes ?? [];
    const paymodes = raw.paymodes ?? [];

    return {
      menu,
      group: legacyGroup,
      category: categories,
      orderTypes,
      paymodes
    } as MenuMasterData;
  },

  /** GET /api/menu/order-types */
  getOrderTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<PosOrderType[]>>(`/menu/order-types`, {
      params: { clientDb: localStorage.getItem("tenantId") || "" }
    })),

  /** GET /api/menu/{menuId}/categories */
  getGroupCategories: async (menuId: number = 0, orderTypeId?: number) => {
    try {
      const targetMenuId = menuId ?? 0;
      const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/${targetMenuId}/categories`, {
        params: {
          clientDb: localStorage.getItem("tenantId") || "",
          orderTypeId: orderTypeId || 1,
          providerOwnStatus: getProviderOwnStatus(orderTypeId)
        }
      }));
      const list = Array.isArray(raw) ? raw : (Array.isArray((raw as any)?.data) ? (raw as any).data : []);

      return list.map((c: any) => ({
        id: Number(c.categoryId ?? c.id ?? c.catId ?? 0),
        name: String(c.categoryName ?? c.name ?? c.catName ?? ""),
        arabicName: String(c.arabicName ?? c.arabic ?? ""),
        imageUrl: c.imageUrl ?? null,
        colorCode: c.colorCode || "red"
      })).filter((c: PosCategory) => c.id > 0) as PosCategory[];
    } catch (error) {
      console.error(`[menuApi] Failed to fetch menu categories for menuId ${menuId}:`, error);
      return [];
    }
  },

  getMenuCategories: async (menuId: number = 0, orderTypeId?: number) => {
    return menuApi.getGroupCategories(menuId, orderTypeId);
  },

  /** GET /api/menu/categories/{categoryId}/sub-categories */
  getSubCategories: async (categoryId: number) => {
    try {
      const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/categories/${categoryId}/sub-categories`, {
        params: { clientDb: localStorage.getItem("tenantId") || "" }
      }));
      const list = Array.isArray(raw) ? raw : (Array.isArray((raw as any)?.data) ? (raw as any).data : []);
      return list.map((s: any) => ({
        subCategoryId: Number(s.subCategoryId ?? s.id ?? s.subCatId ?? s.subcategoryId ?? 0),
        subCategoryName: String(s.subCategoryName ?? s.name ?? s.subCatName ?? s.subcategoryName ?? ""),
        arabicName: String(s.arabicName ?? ""),
        imageUrl: s.imageUrl ?? null
      })).filter((s: MenuSubCategory) => s.subCategoryId > 0);
    } catch (error) {
      console.error(`[menuApi] Failed to fetch sub-categories for categoryId ${categoryId}:`, error);
      return [];
    }
  },

  /** GET /api/menu/categories/{categoryId}/sub-categories/{subCategoryId}/products */
  getProducts: async (categoryId: number, subCategoryId: number, orderTypeId?: number) => {
    try {
      const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/categories/${categoryId}/sub-categories/${subCategoryId}/products`, {
        params: {
          clientDb: localStorage.getItem("tenantId") || "",
          orderTypeId: orderTypeId || 1,
          currentDateTime: new Date().toISOString(),
          providerOwnStatus: getProviderOwnStatus(orderTypeId)
        }
      }));
      return raw.map((p: any) => ({
        id: p.productId,
        name: p.productName,
        arabicName: p.arabicName,
        categoryId: categoryId,
        price: p.price,
        imageUrl: p.imageUrl,
        colorCode: p.colorCode,
        vatId: p.vatId,
        vatValue: p.vatValue,
        unitId: p.unitId ?? p.defaultUnitId ?? undefined,
        hasAlternatives: p.hasAlternatives ?? false,
        isLocked: p.isLocked ?? false,
        isIncl: p.isIncl !== undefined ? Boolean(p.isIncl) :
                p.priceIsIncl !== undefined ? Boolean(p.priceIsIncl) :
                p.isincl !== undefined ? Boolean(p.isincl) :
                p.priceView !== undefined ? (p.priceView === 'Inclusive') :
                undefined,
      })) as PosProduct[];
    } catch (error) {
      console.error(`[menuApi] Failed to fetch products for cat ${categoryId} sub ${subCategoryId}:`, error);
      return [];
    }
  },

  /** GET /api/menu/product-list */
  searchProducts: async (params: {
    productName: string;
    orderTypeId?: number;
    currentDateTime?: string;
    providerOwnStatus?: boolean;
  }): Promise<import("../types").PosProductSearchResult[]> => {
    try {
      const res = await axiosInstance.get<any>(`/menu/product-list`, {
        params: {
          clientDb: localStorage.getItem("tenantId") || "",
          orderTypeId: params.orderTypeId || 1,
          currentDateTime: params.currentDateTime || new Date().toISOString(),
          productName: params.productName,
          providerOwnStatus: params.providerOwnStatus ?? getProviderOwnStatus(params.orderTypeId)
        }
      });

      const raw = Array.isArray(res.data) 
        ? res.data 
        : (Array.isArray(res.data?.data) ? res.data.data : []);

      return (raw || []).map((p: any) => ({
        productId: p.productId ?? p.id ?? 0,
        productName: p.productName ?? p.name ?? "",
        arabicName: p.arabicName || "",
        vatId: p.vatId,
        vatValue: p.vatValue,
        price: Number(p.price ?? 0),
        hasAlternatives: Boolean(p.hasAlternatives),
        isLocked: Boolean(p.isLocked),
        imageUrl: p.imageUrl,
        code: p.code || p.productCode || "",
        unitId: p.unitId,
        isIncl: p.isIncl !== undefined ? Boolean(p.isIncl) :
                p.priceIsIncl !== undefined ? Boolean(p.priceIsIncl) :
                p.priceView !== undefined ? (p.priceView === 'Inclusive') :
                undefined,
      })).filter((p: any) => p.productId > 0 && p.productName);
    } catch (err) {
      console.error("[menuApi] searchProducts error:", err);
      return [];
    }
  },

  /** GET /api/menu/products/{productId}/alternatives */
  getAlternatives: async (productId: number, orderTypeId?: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const now = new Date();
    const currentDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/products/${productId}/alternatives`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "",
        orderTypeId,
        providerOwnStatus: getProviderOwnStatus(),
        currentDateTime
      }
    }));
    return raw.map((a: any) => ({
      altName: a.altName ?? a.altname ?? a.name,
      price: a.price,
      isIncl: a.isIncl !== undefined ? Boolean(a.isIncl) :
              a.priceIsIncl !== undefined ? Boolean(a.priceIsIncl) :
              a.isincl !== undefined ? Boolean(a.isincl) :
              a.priceView !== undefined ? (a.priceView === 'Inclusive') :
              undefined,
      promoPrice: a.promoPrice !== undefined ? Number(a.promoPrice) : undefined,
      promoIsIncl: a.promoIsIncl !== undefined ? Boolean(a.promoIsIncl) : undefined,
    })) as PosAlternative[];
  },

  /** GET /api/menu/products/{productId}/data */
  getProductData: async (productId: number, orderTypeId?: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const now = new Date();
    const currentDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const raw = await unwrap(axiosInstance.get<ApiResponse<any>>(`/menu/products/${productId}/data`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "",
        orderTypeId,
        currentDateTime
      }
    }));

    return {
      price: raw.price,
      unitId: raw.unitId,
      unitValue: raw.unitValue,
      isIncl: raw.isIncl !== undefined ? Boolean(raw.isIncl) :
              raw.priceIsIncl !== undefined ? Boolean(raw.priceIsIncl) :
              raw.isincl !== undefined ? Boolean(raw.isincl) :
              raw.priceView !== undefined ? (raw.priceView === 'Inclusive') :
              false,
      promoPrice: raw.promoPrice !== undefined ? Number(raw.promoPrice) : undefined,
      promoIsIncl: raw.promoIsIncl !== undefined ? Boolean(raw.promoIsIncl) : undefined,
    };
  },

  /** GET /api/menu/extras */
  getExtras: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ extras: any[] | null }>>("/menu/extras", { params: { clientDb: localStorage.getItem("tenantId") || "", typeId, categoryId } })),

  /** GET /api/menu/extras-type */
  getExtraTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/extras-type${getTenantQuery()}`)),

  /** GET /api/menu/modifiers */
  getModifiers: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ modifier: any[] | null }>>("/menu/modifiers", { params: { clientDb: localStorage.getItem("tenantId") || "", typeId, categoryId } })),

  /** GET /api/menu/modifier-type */
  getModifierTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/modifier-type${getTenantQuery()}`)),

  /** GET /api/menu/providers */
  getProviders: () =>
    unwrap(axiosInstance.get<ApiResponse<import("../types").MenuProvider[]>>(`/menu/providers${getTenantQuery()}`)),

  /** GET /api/menu/message */
  getMessages: async (messageName?: string): Promise<{ id: number; name: string }[]> => {
    try {
      const raw = await unwrap(axiosInstance.get<ApiResponse<any>>("/menu/message", { 
        params: { 
          clientDb: localStorage.getItem("tenantId") || "", 
          messageName: messageName || undefined 
        } 
      }));
      const list = Array.isArray(raw) 
        ? raw 
        : (raw?.message || raw?.messages || raw?.data || (raw ? [raw] : []));
      return (list || []).map((m: any) => ({
        id: m.id ?? m.messageId ?? m.modifierId ?? m.ID ?? 0,
        name: m.name ?? m.messageName ?? m.messageText ?? m.description ?? String(m)
      }));
    } catch (err) {
      console.error("[menuApi] getMessages error:", err);
      return [];
    }
  },

  /** POST /api/menu/message */
  createMessage: async (name: string): Promise<{ id: number; name: string }> => {
    const raw: any = await unwrap(axiosInstance.post<ApiResponse<any>>("/menu/message", {
      name,
      createdAt: new Date().toISOString()
    }, {
      params: { clientDb: localStorage.getItem("tenantId") || "" }
    }));
    const id = raw?.id ?? raw?.messageId ?? raw?.modifierId ?? (typeof raw === 'number' ? raw : 0);
    return { id, name };
  },
};
