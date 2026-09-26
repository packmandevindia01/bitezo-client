import type { PosAlternative, PosCartItem } from "../types";
import { POS_CONFIGS_STORAGE_KEY } from "../services/posConfigApi";
import { store } from "../../../app/store";

export type AlternativeOrderOption = "Id" | "Name" | "Price";

/**
 * Checks whether the given text contains Arabic characters.
 */
export const containsArabic = (text?: string | null): boolean => {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text));
};

/**
 * Checks if KOT Arabic is enabled in runtime configuration.
 */
export const isKotArabicEnabled = (): boolean => {
  try {
    const direct = localStorage.getItem("kotArabic");
    if (direct !== null) {
      const s = direct.trim().toLowerCase();
      if (s === "enable" || s === "true" || s === "1") return true;
      if (s === "disable" || s === "false" || s === "0") return false;
    }
    const keys = ["posConfigs", "posConfig", "pos_configs", "pos_config"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configsObj = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const val = configsObj?.kotArabic ?? configsObj?.KotArabic ?? parsed?.kotArabic ?? parsed?.KotArabic;
        if (val !== undefined && val !== null) {
          const str = String(val).trim().toLowerCase();
          if (str === "enable" || str === "true" || str === "1" || val === true) {
            return true;
          }
          if (str === "disable" || str === "false" || str === "0" || val === false) {
            return false;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading kotArabic config:", e);
  }
  return false;
};

/**
 * Checks if Bill Arabic is enabled in runtime configuration.
 */
export const isBillArabicEnabled = (): boolean => {
  try {
    const direct = localStorage.getItem("billArabic");
    if (direct !== null) {
      const s = direct.trim().toLowerCase();
      if (s === "enable" || s === "true" || s === "1") return true;
      if (s === "disable" || s === "false" || s === "0") return false;
    }
    const keys = ["posConfigs", "posConfig", "pos_configs", "pos_config"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configsObj = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const val = configsObj?.billArabic ?? configsObj?.BillArabic ?? parsed?.billArabic ?? parsed?.BillArabic;
        if (val !== undefined && val !== null) {
          const str = String(val).trim().toLowerCase();
          if (str === "enable" || str === "true" || str === "1" || val === true) {
            return true;
          }
          if (str === "disable" || str === "false" || str === "0" || val === false) {
            return false;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading billArabic config:", e);
  }
  return false;
};

/**
 * Checks whether an item in the cart is an alternative product.
 */
export const isAlternativeCartItem = (item?: PosCartItem | null): boolean => {
  if (!item) return false;
  const vName = (item.variantName || "").trim().toLowerCase();
  const hasVariant = vName !== "" && vName !== "main" && vName !== "variation";
  const hasAltArabic = Boolean(item.variantArabic || (item as any).altArabic);
  return hasVariant || hasAltArabic;
};

/**
 * Retrieves the formatted Arabic display text for any cart item (standard or alternative).
 * Returns an empty string if no Arabic name is available.
 */
export const getItemArabicName = (item?: PosCartItem | null): string => {
  if (!item) return "";

  const altArabic = (
    item.variantArabic || 
    (item as any).altArabic || 
    (item as any).altArabicName || 
    (item as any).variant_arabic || 
    (item as any).VariantArabic ||
    (item as any).AltArabic ||
    (item as any).alt_arabic ||
    ""
  ).trim();

  let prodArabic = (
    item.product?.arabicName || 
    (item as any).arabicName || 
    (item as any).productArabicName || 
    (item as any).product?.arabic_name || 
    (item as any).arabic_name || 
    (item as any).product?.arabic ||
    (item as any).arabic ||
    (item as any).ArabicName ||
    (item as any).productArabic ||
    ""
  ).trim();

  // If product Arabic not present directly, attempt lookup from Redux productCache by productId
  if (!prodArabic && item.productId) {
    try {
      const cached = (store.getState() as any)?.pos?.productCache?.[item.productId];
      if (cached?.arabicName) {
        prodArabic = String(cached.arabicName).trim();
      }
    } catch {}
  }

  // If both product Arabic and variant Arabic exist
  if (prodArabic && altArabic) {
    if (altArabic.includes(prodArabic)) return altArabic;
    return `${prodArabic} - ${altArabic}`;
  }

  // If only variant Arabic exists
  if (altArabic) return altArabic;

  // If product Arabic exists and has a non-main variant name (without variant Arabic)
  if (prodArabic && item.variantName && item.variantName.toLowerCase().trim() !== "main") {
    return `${prodArabic} - ${item.variantName}`;
  }

  // If only product Arabic exists (standard product or main variant)
  return prodArabic;
};

/**
 * Backward-compatible alias for getItemArabicName.
 */
export const getAlternativeArabicName = (item?: PosCartItem | null): string => {
  return getItemArabicName(item);
};

/**
 * Reads the configured Alternative Order By option from local storage.
 * Defaults to "Id" if not found or invalid.
 */
export const getAlternativeOrderBy = (): AlternativeOrderOption => {
  try {
    const raw = localStorage.getItem(POS_CONFIGS_STORAGE_KEY) || localStorage.getItem("posConfig");
    if (raw) {
      const parsed = JSON.parse(raw);
      const val = parsed?.configs?.alternativeOrder ?? parsed?.alternativeOrder;
      if (typeof val === "string") {
        const lower = val.trim().toLowerCase();
        if (lower === "name") return "Name";
        if (lower === "price") return "Price";
        if (lower === "id") return "Id";
      }
    }
  } catch (e) {
    console.error("Error reading alternativeOrder config:", e);
  }
  return "Id";
};

/**
 * Sorts alternative products based on the specified or configured order option:
 * - "Id": Ascending numerical order by id / unitId
 * - "Name": Alphabetical order by altName (A-Z)
 * - "Price": Ascending order by price (lowest to highest)
 */
export const sortAlternatives = (
  items: PosAlternative[],
  orderBy?: AlternativeOrderOption | string
): PosAlternative[] => {
  if (!items || items.length <= 1) return items;

  const order = (orderBy || getAlternativeOrderBy() || "Id").toString().trim().toLowerCase();
  const sorted = [...items];

  if (order === "name") {
    sorted.sort((a, b) => {
      const nameA = String(a.altName || "").trim();
      const nameB = String(b.altName || "").trim();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });
  } else if (order === "price") {
    sorted.sort((a, b) => {
      const priceA = Number(a.price ?? 0);
      const priceB = Number(b.price ?? 0);
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      const nameA = String(a.altName || "").trim();
      const nameB = String(b.altName || "").trim();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });
  } else {
    // Default: "id"
    sorted.sort((a, b) => {
      const idA = Number(a.id ?? (a as any).altId ?? (a as any).altProductId ?? a.unitId ?? 0);
      const idB = Number(b.id ?? (b as any).altId ?? (b as any).altProductId ?? b.unitId ?? 0);
      if (idA !== idB) {
        return idA - idB;
      }
      const nameA = String(a.altName || "").trim();
      const nameB = String(b.altName || "").trim();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  return sorted;
};
