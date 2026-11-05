import { round as moneyRound } from "./money";
// src/utils/currency.ts — DYNAMIC, never hardcoded

export const getCurrencySymbol = (): string =>
  localStorage.getItem("currencySymbol") ?? "BHD";

export const getDecimalPart = (): number =>
  parseInt(localStorage.getItem("decimalPart") ?? "3", 10);

export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  const decimals = getDecimalPart();
  const symbol = getCurrencySymbol();
  if (numValue === 0) {
    return `${symbol} ${(0).toFixed(decimals)}`;
  }
  // Exact decimal, half-up, float noise removed first — see utils/money.ts.
  const rounded = moneyRound(numValue, decimals);
  return `${symbol} ${rounded.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatAmount = (value: number | string): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  const decimals = getDecimalPart();
  if (numValue === 0) {
    return (0).toFixed(decimals);
  }
  // Exact decimal, half-up, float noise removed first — see utils/money.ts.
  const rounded = moneyRound(numValue, decimals);
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/** ISO 4217 minor units for currencies whose decimals differ from 2. */
const THREE_DECIMALS = new Set(["BHD", "KWD", "OMR", "JOD", "IQD", "LYD", "TND"]);
const ZERO_DECIMALS = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "XAF", "XOF"]);

/**
 * Decimals to use when the backend did not send `decimalPart`: derived from the currency code
 * (BHD / KWD / OMR = 3 fils / baisa). The old fallback was a fixed 2 even with "BHD".
 */
export const currencyDecimals = (currencyCode: unknown, fallback = 3): number => {
  const code = String(currencyCode ?? "").trim().toUpperCase();
  if (!code) return fallback;
  if (THREE_DECIMALS.has(code)) return 3;
  if (ZERO_DECIMALS.has(code)) return 0;
  return /^[A-Z]{3}$/.test(code) ? 2 : fallback;
};

/** decimalPart from the backend if it is a valid number (0 allowed), else derived from the currency. */
export const resolveDecimalPart = (decimalPart: unknown, currencyCode: unknown): number => {
  const n = Number(decimalPart);
  return decimalPart !== null && decimalPart !== undefined && decimalPart !== "" && Number.isInteger(n) && n >= 0 && n <= 6
    ? n
    : currencyDecimals(currencyCode);
};
