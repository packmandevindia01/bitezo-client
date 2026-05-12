import axiosInstance from "../../../api/axiosInstance";
import type { 
  PosCategory, 
  MenuSubCategory, 
  PosProduct, 
  MenuMasterData,
  PosAlternative
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

export const menuApi = {
  /** GET /api/menu/master-data */
  getMasterData: async () => {
    const raw = await unwrap(axiosInstance.get<ApiResponse<any>>("/menu/master-data"));
    return {
      group: raw.group,
      category: raw.category.map((c: any) => ({
        id: c.categoryId,
        name: c.categoryName,
        arabicName: c.arabicName,
        imageUrl: c.imageUrl,
        colorCode: c.colorCode
      }))
    } as MenuMasterData;
  },

  /** GET /api/menu/{groupId}/categories */
  getGroupCategories: async (groupId: number) => {
    const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/${groupId}/categories`));
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
    unwrap(axiosInstance.get<ApiResponse<MenuSubCategory[]>>(`/menu/categories/${categoryId}/sub-categories`)),

  /** GET /api/menu/categories/{categoryId}/sub-categories/{subCategoryId}/products */
  getProducts: async (categoryId: number, subCategoryId: number) => {
    const raw = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/categories/${categoryId}/sub-categories/${subCategoryId}/products`));
    return raw.map((p: any) => ({
      id: p.productId,
      name: p.productName,
      arabicName: p.arabicName,
      categoryId: categoryId,
      price: p.price,
      imageUrl: p.imageUrl,
      colorCode: p.colorCode,
      vatValue: p.vatValue
    })) as PosProduct[];
  },

  /** GET /api/menu/products/{productId}/alternatives */
  getAlternatives: (productId: number) => 
    unwrap(axiosInstance.get<ApiResponse<PosAlternative[]>>(`/menu/products/${productId}/alternatives`)),

  /** GET /api/menu/extras */
  getExtras: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ extras: any[] | null }>>("/menu/extras", { params: { typeId, categoryId } })),

  /** GET /api/menu/extras-type */
  getExtraTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>("/menu/extras-type")),

  /** GET /api/menu/modifiers */
  getModifiers: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ modifier: any[] | null }>>("/menu/modifiers", { params: { typeId, categoryId } })),

  /** GET /api/menu/modifier-type */
  getModifierTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>("/menu/modifier-type")),
};
