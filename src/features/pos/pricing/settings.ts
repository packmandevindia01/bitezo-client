/**
 * Order-type helpers and PricingSettings construction.
 * Pure — callers pass in the raw configuration values (rates as PERCENT, e.g. 10).
 */
import type { PricingSettings, TaxMode } from "./types";

const normalizeName = (name?: string | null) => String(name || "").toLowerCase().replace(/[\s_-]/g, "");

/** Service charge applies to Dine-In only. */
export const isDineInOrderType = (orderTypeName?: string | null): boolean =>
  normalizeName(orderTypeName).includes("dine");

export const isDeliveryOrderType = (orderTypeName?: string | null, orderTypeId?: number | null): boolean =>
  orderTypeId === 4 || normalizeName(orderTypeName).includes("delivery");

export const toTaxMode = (value: unknown, fallback: TaxMode = "Exclusive"): TaxMode => {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "inclusive") return "Inclusive";
  if (v === "exclusive") return "Exclusive";
  return fallback;
};

const toRate = (rate: unknown): number => {
  const n = Number(rate);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export interface RawPricingConfig {
  vatEnabled: boolean;
  /** percent, e.g. 10 */
  defaultVatRate: number;
  /** percent, e.g. 10 */
  serviceChargeRate: number;
  /** percent, e.g. 5 */
  levyRate: number;
  discountCalc: TaxMode | string;
  priceView: TaxMode | string;
  orderTypeName?: string | null;
}

export const buildPricingSettings = (raw: RawPricingConfig): PricingSettings => ({
  vatEnabled: Boolean(raw.vatEnabled),
  defaultVatRate: toRate(raw.defaultVatRate),
  serviceChargeRate: isDineInOrderType(raw.orderTypeName) ? toRate(raw.serviceChargeRate) : 0,
  levyRate: toRate(raw.levyRate),
  discountCalc: toTaxMode(raw.discountCalc),
  priceView: toTaxMode(raw.priceView),
});
