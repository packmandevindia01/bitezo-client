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
    if (!res.data.isSuccess) throw new Error(res.data.message);
    return res.data.data;
  });

const getTenantQuery = () => {
  const tenantId = localStorage.getItem("tenantId") || "";
  return `?clientDb=${tenantId}`;
};

const getProviderOwnStatus = () => {
  try {
    const saved = localStorage.getItem('posConfigs');
    const full = saved ? JSON.parse(saved) : {};
    return full?.configs?.providerOwnMenuStatus === true;
  } catch {
    return false;
  }
};

export const menuApi = {
  /** GET /api/menu/master-data */
  getMasterData: async () => {
    // Format as HH:mm:ss for .NET TimeSpan binding
    const now = new Date();
    const timeSpanString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const raw = await unwrap(axiosInstance.get<ApiResponse<any>>(`/menu/master-data`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "",
        currentTime: timeSpanString
      }
    }));
    const groups = raw.groups ?? raw.group ?? [];
    const categories = raw.categories ?? raw.category ?? [];
    const orderTypes = raw.orderTypes ?? [];

    return {
      group: groups,
      category: categories.map((c: any) => ({
        id: c.categoryId,
        name: c.categoryName,
        arabicName: c.arabicName,
        imageUrl: c.imageUrl,
        colorCode: c.colorCode
      })),
      orderTypes
    } as MenuMasterData;
  },

  /** GET /api/menu/order-types */
  getOrderTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<PosOrderType[]>>(`/menu/order-types`, {
      params: { clientDb: localStorage.getItem("tenantId") || "" }
    })),

  /** GET /api/menu/{groupId}/categories */
  getGroupCategories: async (groupId: number, orderTypeId?: number) => {
    try {
      const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/${groupId}/categories`, {
        params: {
          clientDb: localStorage.getItem("tenantId") || "",
          orderTypeId
        }
      }));
      return raw.map((c: any) => ({
        id: c.categoryId,
        name: c.categoryName,
        arabicName: c.arabicName,
        imageUrl: c.imageUrl,
        colorCode: c.colorCode
      })) as PosCategory[];
    } catch (error) {
      console.error(`[menuApi] Failed to fetch group categories for groupId ${groupId}:`, error);
      return [];
    }
  },

  /** GET /api/menu/categories/{categoryId}/sub-categories */
  getSubCategories: async (categoryId: number) => {
    try {
      return await unwrap(axiosInstance.get<ApiResponse<MenuSubCategory[]>>(`/menu/categories/${categoryId}/sub-categories`, {
        params: { clientDb: localStorage.getItem("tenantId") || "" }
      }));
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
          orderTypeId,
          currentDateTime: new Date().toISOString(),
          providerOwnStatus: getProviderOwnStatus()
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
        vatValue: p.vatValue,
        unitId: p.unitId ?? p.defaultUnitId ?? undefined,
        hasAlternatives: p.hasAlternatives ?? false,
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
};
