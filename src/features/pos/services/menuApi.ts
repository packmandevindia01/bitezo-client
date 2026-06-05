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
  const tenantId = localStorage.getItem("tenantId") || "app_db";
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
        clientDb: localStorage.getItem("tenantId") || "app_db",
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
      params: { clientDb: localStorage.getItem("tenantId") || "app_db" }
    })),

  /** GET /api/menu/{groupId}/categories */
  getGroupCategories: async (groupId: number, orderTypeId?: number) => {
    const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/${groupId}/categories`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "app_db",
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
  },

  /** GET /api/menu/categories/{categoryId}/sub-categories */
  getSubCategories: (categoryId: number) => 
    unwrap(axiosInstance.get<ApiResponse<MenuSubCategory[]>>(`/menu/categories/${categoryId}/sub-categories`, {
      params: { clientDb: localStorage.getItem("tenantId") || "app_db" }
    })),

  /** GET /api/menu/categories/{categoryId}/sub-categories/{subCategoryId}/products */
  getProducts: async (categoryId: number, subCategoryId: number, orderTypeId?: number) => {
    const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/categories/${categoryId}/sub-categories/${subCategoryId}/products`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "app_db",
        orderTypeId,
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
  },

  /** GET /api/menu/products/{productId}/alternatives */
  getAlternatives: async (productId: number, orderTypeId?: number) => {
    const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/products/${productId}/alternatives`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "app_db",
        orderTypeId,
        providerOwnStatus: getProviderOwnStatus()
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
    })) as PosAlternative[];
  },

  /** GET /api/menu/products/{productId}/data */
  getProductData: (productId: number, orderTypeId?: number) => 
    unwrap(axiosInstance.get<ApiResponse<{ isIncl: boolean, price: number, unitId: number, unitValue: number }>>(`/menu/products/${productId}/data`, {
      params: {
        clientDb: localStorage.getItem("tenantId") || "app_db",
        orderTypeId
      }
    })),

  /** GET /api/menu/extras */
  getExtras: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ extras: any[] | null }>>("/menu/extras", { params: { clientDb: localStorage.getItem("tenantId") || "app_db", typeId, categoryId } })),

  /** GET /api/menu/extras-type */
  getExtraTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/extras-type${getTenantQuery()}`)),

  /** GET /api/menu/modifiers */
  getModifiers: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ modifier: any[] | null }>>("/menu/modifiers", { params: { clientDb: localStorage.getItem("tenantId") || "app_db", typeId, categoryId } })),

  /** GET /api/menu/modifier-type */
  getModifierTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/modifier-type${getTenantQuery()}`)),

  /** GET /api/menu/providers */
  getProviders: () =>
    unwrap(axiosInstance.get<ApiResponse<import("../types").MenuProvider[]>>(`/menu/providers${getTenantQuery()}`)),
};
