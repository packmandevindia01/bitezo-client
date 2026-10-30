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
  const factor = Math.pow(10, decimals);
  const sign = numValue < 0 ? -1 : 1;
  const abs = Math.abs(numValue);
  const rounded = sign * (Math.round((abs + 1e-11) * factor) / factor);
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
  const factor = Math.pow(10, decimals);
  const sign = numValue < 0 ? -1 : 1;
  const abs = Math.abs(numValue);
  const rounded = sign * (Math.round((abs + 1e-11) * factor) / factor);
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
