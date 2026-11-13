import { unwrapEnvelope as unwrap } from "../../../shared/api/unwrap";
import axiosInstance from "../../../api/axiosInstance";
import type { 
  PosCategory, 
  MenuSubCategory, 
  PosProduct, 
  MenuMasterData,
  PosAlternative,
  PosOrderType
} from "../types";
import { sortAlternatives } from "../utils/alternativeHelpers";
import { resolveImageUrl } from "../../../utils/imageUtils";
import { getPriceView } from "../terminal/utils/billing";

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  isSuccess: boolean;
}


const getTenantQuery = () => {
  const tenantId = localStorage.getItem("tenantId") || "";
  return `?clientDb=${tenantId}`;
};

export const getProviderOwnStatus = (orderTypeId?: number) => {
  try {
    const saved = localStorage.getItem('posConfigs');
    const full = saved ? JSON.parse(saved) : {};
    const val = full?.configs?.providerOwnStatus ?? 
                full?.configs?.providerOwnMenuStatus ?? 
                full?.configs?.ProviderOwnStatus ??
                full?.providerOwnStatus;
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

/* ── Provider menus ───────────────────────────────────────────────────────────────────────────────────────────────
 * A provider order asks the menu with the PROVIDER ID as orderTypeId (Swiggy 5, Zomato 6 …; ids after the order
 * types 1–4). Backend 8060, checked 2026-11-12 with two providers:
 *  - correct per provider: categories, product-list (search);
 *  - WRONG: products by category return every provider's rows (each product once per provider, only the price
 *    differs, nothing tells them apart), product data returns the first provider's price, alternatives repeat.
 * Until the backend is fixed, the provider's own list from product-list (correct) decides which products a category
 * shows and their price. Remove this block once products / product data filter by provider. */
export const isProviderMenuOrderType = (orderTypeId?: number) => Number(orderTypeId) > 4;

const PROVIDER_PRICE_TTL_MS = 60_000;
const providerPriceCache = new Map<number, { at: number; prices: Promise<Map<number, number>> }>();

/** productId → the provider's price, from product-list (correct per provider). Cached for a minute. */
const providerPrices = (orderTypeId: number): Promise<Map<number, number>> => {
  const hit = providerPriceCache.get(orderTypeId);
  if (hit && Date.now() - hit.at < PROVIDER_PRICE_TTL_MS) return hit.prices;
  const prices = menuApi
    .searchProducts({ productName: "", orderTypeId, providerOnly: true })
    .then((list) => new Map(list.map((p) => [Number(p.productId), Number(p.price)] as [number, number])))
    .catch(() => new Map<number, number>());
  providerPriceCache.set(orderTypeId, { at: Date.now(), prices });
  return prices;
};

/** Forget the cached provider price lists (New Order, menu updated). */
export const clearProviderPriceCache = () => providerPriceCache.clear();

/**
 * Category products on a provider menu: one row per product with the provider's price. With the provider's own menu on,
 * only its products; with it off, every product (the provider's price where it has one).
 */
export const fixProviderMenuProducts = <T extends { id: number; price?: number }>(rows: T[], prices: Map<number, number>, ownMenuOnly: boolean): T[] => {
  if (prices.size === 0) return rows;
  const seen = new Set<number>();
  const out: T[] = [];
  for (const row of rows) {
    const id = Number(row.id);
    if (seen.has(id)) continue;
    const price = prices.get(id);
    if (price === undefined && ownMenuOnly) continue;
    seen.add(id);
    out.push(price === undefined ? row : { ...row, price });
  }
  return out;
};

/** "HH:mm[:ss]" → seconds since midnight, or null. */
const timeOfDay = (value: unknown): number | null => {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(value ?? "").trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
};

/**
 * Whether a menu session runs at `now` ("HH:mm:ss"). No times → always (the server decides). Start = end → all day.
 * A window that ends earlier than it starts runs over midnight (22:00 – 02:00). End is exclusive.
 */
export const isMenuSessionRunning = (start: unknown, end: unknown, now: string): boolean => {
  const s = timeOfDay(start);
  const e = timeOfDay(end);
  const t = timeOfDay(now);
  if (s === null || e === null || t === null) return true;
  if (s === e) return true;
  return s < e ? t >= s && t < e : t >= s || t < e;
};

const MODIFIER_TYPES_CACHE_KEY = "bitezo_modifier_types_cache";
let cachedModifierTypes: { typeId: number; typeName: string }[] = [];

export const getCachedModifierTypes = (): { typeId: number; typeName: string }[] => {
  if (cachedModifierTypes.length > 0) return cachedModifierTypes;
  try {
    const raw = sessionStorage.getItem(MODIFIER_TYPES_CACHE_KEY);
    if (raw) {
      cachedModifierTypes = JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return cachedModifierTypes;
};

export const setCachedModifierTypes = (types: any[]) => {
  if (!Array.isArray(types)) return;
  cachedModifierTypes = types.map((t: any) => ({
    typeId: Number(t.typeId ?? t.id ?? 0),
    typeName: String(t.typeName ?? t.name ?? t.modifierTypeName ?? "").trim(),
  }));
  try {
    sessionStorage.setItem(MODIFIER_TYPES_CACHE_KEY, JSON.stringify(cachedModifierTypes));
  } catch { /* ignore */ }
};

const EXTRAS_CACHE_KEY = "bitezo_extras_cache";
let cachedExtras: { id: number; name: string; price: number; typeId: number }[] = [];

export const getCachedExtras = (): { id: number; name: string; price: number; typeId: number }[] => {
  if (cachedExtras.length > 0) return cachedExtras;
  try {
    const raw = sessionStorage.getItem(EXTRAS_CACHE_KEY);
    if (raw) {
      cachedExtras = JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return cachedExtras;
};

export const setCachedExtras = (extras: any[]) => {
  if (!Array.isArray(extras)) return;
  cachedExtras = extras.map((e: any) => ({
    id: Number(e.extrasId ?? e.extraId ?? e.id ?? e.ID ?? 0),
    name: String(e.extraName ?? e.name ?? e.Name ?? "").trim(),
    price: Number(e.price ?? 0),
    typeId: 2,
  }));
  try {
    sessionStorage.setItem(EXTRAS_CACHE_KEY, JSON.stringify(cachedExtras));
  } catch { /* ignore */ }
};

export const getModifierTypeNameById = (typeId?: number): string => {
  if (!typeId) return "";
  const list = getCachedModifierTypes();
  const found = list.find((t) => t.typeId === Number(typeId));
  return found?.typeName || "";
};

/** An extra as the server may send it: field names differ between API versions. */
interface RawExtra {
  extrasId?: number;
  extraId?: number;
  id?: number;
  ID?: number;
  extraName?: string;
  name?: string;
  Name?: string;
  price?: number;
}
type RawExtrasBody = RawExtra[] | { extras?: RawExtra[] | null; data?: RawExtra[] | null } | null;

/** Loads every extra from the server and replaces the session cache. Throws if the request fails. */
const fetchAllExtras = async (): Promise<{ id: number; name: string; price: number; typeId: number }[]> => {
  const res = await unwrap(axiosInstance.get<ApiResponse<RawExtrasBody>>("/menu/extras", { params: { clientDb: localStorage.getItem("tenantId") || "" } }));
  const list = Array.isArray(res) ? res : (res?.extras || res?.data || []);
  const normalized = list.map((e) => ({
    id: Number(e.extrasId ?? e.extraId ?? e.id ?? e.ID ?? 0),
    name: String(e.extraName ?? e.name ?? e.Name ?? "").trim(),
    price: Number(e.price ?? 0),
    typeId: 2,
  }));
  setCachedExtras(normalized);
  return normalized;
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

    // Menu sessions running now. The server should filter by currentTime but (8060, 2026-11-12) returns every session
    // at any hour; when it sends each session's start / end time, the POS filters them itself (isMenuSessionRunning).
    const rawMenu = (raw.menu ?? raw.groups ?? raw.group ?? []).filter((m: { startTime?: unknown; StartTime?: unknown; endTime?: unknown; EndTime?: unknown }) =>
      isMenuSessionRunning(m.startTime ?? m.StartTime, m.endTime ?? m.EndTime, timeSpanString));
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

    const categoryMap = new Map<number, PosCategory>();

    masterCategories.forEach((c: any) => {
      const id = Number(c.categoryId ?? c.id ?? 0);
      if (id > 0) {
        categoryMap.set(id, {
          id,
          name: String(c.categoryName ?? c.name ?? ""),
          arabicName: String(c.arabicName ?? c.arabic ?? ""),
          imageUrl: c.imageUrl ? resolveImageUrl(c.imageUrl) : null,
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

      // Menu 0 ("all") repeats a category once per menu session it is in (8060, 2026-11-12): keep one of each.
      const seenCategoryIds = new Set<number>();
      return list.filter((c: { categoryId?: unknown; id?: unknown; catId?: unknown }) => {
        const id = Number(c.categoryId ?? c.id ?? c.catId ?? 0);
        if (seenCategoryIds.has(id)) return false;
        seenCategoryIds.add(id);
        return true;
      }).map((c: any) => ({
        id: Number(c.categoryId ?? c.id ?? c.catId ?? 0),
        name: String(c.categoryName ?? c.name ?? c.catName ?? ""),
        arabicName: String(c.arabicName ?? c.arabic ?? ""),
        imageUrl: c.imageUrl ? resolveImageUrl(c.imageUrl) : null,
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
        imageUrl: s.imageUrl ? resolveImageUrl(s.imageUrl) : null
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
      const rows = raw.map((p: any) => ({
        id: p.productId,
        name: p.productName,
        arabicName: p.arabicName,
        categoryId: categoryId,
        price: p.price,
        imageUrl: p.imageUrl ? resolveImageUrl(p.imageUrl) : undefined,
        colorCode: p.colorCode,
        vatId: p.vatId,
        vatValue: p.vatValue,
        unitId: p.unitId ?? p.defaultUnitId ?? undefined,
        hasAlternatives: p.hasAlternatives ?? false,
        isLocked: p.isLocked ?? false,
        priceIsIncl: p.priceIsIncl !== undefined ? Boolean(p.priceIsIncl) :
                     p.PriceIsIncl !== undefined ? Boolean(p.PriceIsIncl) :
                     p.isIncl !== undefined ? Boolean(p.isIncl) :
                     p.IsIncl !== undefined ? Boolean(p.IsIncl) :
                     undefined,
        isIncl: p.isIncl !== undefined ? Boolean(p.isIncl) :
                p.IsIncl !== undefined ? Boolean(p.IsIncl) :
                p.priceIsIncl !== undefined ? Boolean(p.priceIsIncl) :
                p.PriceIsIncl !== undefined ? Boolean(p.PriceIsIncl) :
                p.isincl !== undefined ? Boolean(p.isincl) :
                p.priceView !== undefined ? (p.priceView === 'Inclusive') :
                undefined,
      })) as PosProduct[];
      if (!isProviderMenuOrderType(orderTypeId)) return rows;
      return fixProviderMenuProducts(rows, await providerPrices(Number(orderTypeId)), getProviderOwnStatus(orderTypeId));
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
    /** Only the provider's own products, as the server returns them (provider price list). */
    providerOnly?: boolean;
  }): Promise<import("../types").PosProductSearchResult[]> => {
    // Provider order with its own menu OFF: every product, at the provider's price where it has one.
    // The server's product-list returns only the provider's products for a provider id even with
    // providerOwnStatus=false (8060, 2026-11-13: Zomato 13 of 16), so merge it over the normal list.
    const ownMenu = params.providerOwnStatus ?? getProviderOwnStatus(params.orderTypeId);
    if (isProviderMenuOrderType(params.orderTypeId) && !ownMenu && !params.providerOnly) {
      const [all, mine] = await Promise.all([
        menuApi.searchProducts({ ...params, orderTypeId: 1, providerOwnStatus: false }),
        menuApi.searchProducts({ ...params, providerOnly: true }),
      ]);
      const minePrice = new Map(mine.map((p) => [Number(p.productId), p.price] as [number, number]));
      const allIds = new Set(all.map((p) => Number(p.productId)));
      return [
        ...all.map((p) => (minePrice.has(Number(p.productId)) ? { ...p, price: minePrice.get(Number(p.productId))! } : p)),
        ...mine.filter((p) => !allIds.has(Number(p.productId))),
      ];
    }
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
        imageUrl: p.imageUrl ? resolveImageUrl(p.imageUrl) : undefined,
        code: p.code || p.productCode || "",
        unitId: p.unitId,
        priceIsIncl: p.priceIsIncl !== undefined ? Boolean(p.priceIsIncl) :
                     p.PriceIsIncl !== undefined ? Boolean(p.PriceIsIncl) :
                     p.isIncl !== undefined ? Boolean(p.isIncl) :
                     p.IsIncl !== undefined ? Boolean(p.IsIncl) :
                     undefined,
        isIncl: p.isIncl !== undefined ? Boolean(p.isIncl) :
                p.IsIncl !== undefined ? Boolean(p.IsIncl) :
                p.priceIsIncl !== undefined ? Boolean(p.priceIsIncl) :
                p.PriceIsIncl !== undefined ? Boolean(p.PriceIsIncl) :
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
    const mapped = raw.map((a: any) => {
      const resolvedUnitId = a.unitId ?? a.UnitId ?? a.unitID ?? a.UnitID ?? a.altId ?? a.AltId ?? a.id ?? a.Id;
      const resolvedAltName = a.altName ?? a.AltName ?? a.altname ?? a.name ?? a.Name ?? "";
      const resolvedAltArabic = a.altArabic ?? a.AltArabic ?? a.altarabic ?? a.arabic ?? a.Arabic ?? "";
      return {
        ...a,
        id: a.id ?? a.Id ?? a.altId ?? a.AltId ?? a.altProductId ?? a.AltProductId ?? resolvedUnitId,
        unitId: resolvedUnitId,
        altName: resolvedAltName,
        altArabic: resolvedAltArabic,
        price: Number(a.price ?? a.Price ?? 0),
        isIncl: a.isIncl !== undefined ? Boolean(a.isIncl) :
                a.IsIncl !== undefined ? Boolean(a.IsIncl) :
                a.priceIsIncl !== undefined ? Boolean(a.priceIsIncl) :
                a.PriceIsIncl !== undefined ? Boolean(a.PriceIsIncl) :
                a.isincl !== undefined ? Boolean(a.isincl) :
                a.priceView !== undefined ? (a.priceView === 'Inclusive') :
                (getPriceView() === 'Inclusive'),
        promoPrice: (a.promoPrice ?? a.PromoPrice) !== undefined ? Number(a.promoPrice ?? a.PromoPrice) : undefined,
        promoIsIncl: (a.promoIsIncl ?? a.PromoIsIncl) !== undefined ? Boolean(a.promoIsIncl ?? a.PromoIsIncl) : undefined,
      };
    }) as PosAlternative[];

    // Provider menus repeat each alternative once per provider: keep one of each identical row.
    const seenAlt = new Set<string>();
    const unique = mapped.filter((a: any) => {
      const key = `${a.unitId}|${a.altName}|${a.price}`;
      if (seenAlt.has(key)) return false;
      seenAlt.add(key);
      return true;
    });
    return sortAlternatives(unique);
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

    // Provider menus: the provider's own price (the backend returns the first provider's), see fixProviderMenuProducts.
    const providerPrice = isProviderMenuOrderType(orderTypeId) ? (await providerPrices(Number(orderTypeId))).get(Number(productId)) : undefined;
    return {
      price: providerPrice ?? raw.price,
      unitId: raw.unitId,
      unitValue: raw.unitValue,
      isIncl: raw.isIncl !== undefined ? Boolean(raw.isIncl) :
              raw.priceIsIncl !== undefined ? Boolean(raw.priceIsIncl) :
              raw.isincl !== undefined ? Boolean(raw.isincl) :
              raw.priceView !== undefined ? (raw.priceView === 'Inclusive') :
              (getPriceView() === 'Inclusive'),
      promoPrice: raw.promoPrice !== undefined ? Number(raw.promoPrice) : undefined,
      promoIsIncl: raw.promoIsIncl !== undefined ? Boolean(raw.promoIsIncl) : undefined,
    };
  },

  /** GET /api/menu/extras */
  getExtras: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ extras: any[] | null }>>("/menu/extras", { params: { clientDb: localStorage.getItem("tenantId") || "", typeId, categoryId } })),

  getAllExtras: async (): Promise<{ id: number; name: string; price: number; typeId: number }[]> => {
    const cached = getCachedExtras();
    if (cached.length > 0) return cached;
    try {
      return await fetchAllExtras();
    } catch (e) {
      console.warn("[menuApi] getAllExtras error:", e);
      return cached;
    }
  },

  /** After extras are edited in this tab. A failed request keeps the old list: saved orders use it to recognise extras. */
  refreshAllExtras: async (): Promise<void> => {
    try {
      await fetchAllExtras();
    } catch (e) {
      console.warn("[menuApi] refreshAllExtras error:", e);
    }
  },

  /** GET /api/menu/extras-type */
  getExtraTypes: () =>
    unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/extras-type${getTenantQuery()}`)),

  /** GET /api/menu/modifiers */
  getModifiers: (typeId?: number, categoryId?: number) =>
    unwrap(axiosInstance.get<ApiResponse<{ modifier: any[] | null }>>("/menu/modifiers", { params: { clientDb: localStorage.getItem("tenantId") || "", typeId, categoryId } })),

  /** GET /api/menu/modifier-type */
  getModifierTypes: async (): Promise<any[]> => {
    try {
      const res = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/modifier-type${getTenantQuery()}`));
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      const normalized = list.map((t: any) => {
        const typeId = Number(t.typeId ?? t.id ?? 0);
        const typeName = String(t.typeName ?? t.name ?? t.modifierTypeName ?? "").trim();
        return {
          ...t,
          typeId,
          typeName,
          name: typeName,
        };
      });
      setCachedModifierTypes(normalized);
      return normalized;
    } catch (e) {
      console.error("[menuApi] getModifierTypes error:", e);
      return [];
    }
  },

  /** GET /api/menu/providers */
  getProviders: async (): Promise<import("../types").MenuProvider[]> => {
    const list = await unwrap(axiosInstance.get<ApiResponse<any[]>>(`/menu/providers${getTenantQuery()}`));
    // Image saved in the Back Office provider master; the path is relative to the backend.
    return (list || []).map((p: any) => ({
      ...p,
      imageUrl: resolveImageUrl(p.imageUrl || p.fileUrl || p.filePath) || null,
    }));
  },

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

  /** GET /api/v1/menu/waiters-list */
  getWaitersList: async (): Promise<import("../types").PosWaiter[]> => {
    try {
      const res = await axiosInstance.get<any>("/menu/waiters-list");
      const payload = res.data;
      if (payload && payload.isSuccess === false) {
        throw new Error(payload.message || "Failed to load waiters");
      }
      const data = payload?.data !== undefined ? payload.data : payload;
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[menuApi] getWaitersList error:", err);
      throw err;
    }
  },
};

