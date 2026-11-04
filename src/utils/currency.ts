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
