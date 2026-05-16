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
  return `${symbol} ${numValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatAmount = (value: number | string): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";
  const decimals = getDecimalPart();
  return numValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
