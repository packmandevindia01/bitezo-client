/**
 * Settings store — typed, safe reads of the device / company / POS settings kept in localStorage.
 *
 * Phase 0 SKELETON: new code reads settings through here instead of `localStorage.getItem(...)`
 * (1,036 direct reads today). Existing callers are migrated in Phase 2 (POS) — until then this module
 * must return exactly what the existing readers return for the same storage.
 */
import { resolveDecimalPart } from "../lib/currency";

type Store = Pick<Storage, "getItem">;
const defaultStore = (): Store | null => (typeof localStorage !== "undefined" ? localStorage : null);

/** Parsed JSON or `fallback` (never throws). */
export const readJson = <T>(key: string, fallback: T, store: Store | null = defaultStore()): T => {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Raw string or `fallback`. */
export const readString = (key: string, fallback = "", store: Store | null = defaultStore()): string =>
  store?.getItem(key) ?? fallback;

/** Finite number or `fallback`. */
export const readNumber = (key: string, fallback: number, store: Store | null = defaultStore()): number => {
  const raw = store?.getItem(key);
  if (raw === null || raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

/** The POS config object (`posConfigs.configs` when wrapped, else `posConfigs`). */
export const getPosConfigs = (store: Store | null = defaultStore()): Record<string, any> => {
  const parsed = readJson<Record<string, any> | null>("posConfigs", null, store);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed.configs && typeof parsed.configs === "object" ? parsed.configs : parsed;
};

/** One POS config value with a fallback. */
export const getPosConfigValue = <T>(key: string, fallback: T, store: Store | null = defaultStore()): T => {
  const v = getPosConfigs(store)[key];
  return v === undefined || v === null ? fallback : (v as T);
};

export const getCurrencySymbol = (store: Store | null = defaultStore()): string =>
  readString("currencySymbol", "BHD", store) || "BHD";

/** Currency decimals: stored value when valid, else derived from the currency (BHD = 3). */
export const getDecimals = (store: Store | null = defaultStore()): number =>
  resolveDecimalPart(store?.getItem("decimalPart"), getCurrencySymbol(store));

export const getTenantId = (store: Store | null = defaultStore()): string => readString("tenantId", "", store);
