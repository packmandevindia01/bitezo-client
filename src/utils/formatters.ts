/**
 * Returns the configured decimal part from localStorage
 */
export const getDecimalPart = (): number => {
  return Number(localStorage.getItem("decimalPart")) || 2;
};

/**
 * Returns the configured currency symbol from localStorage
 */
export const getCurrencySymbol = (): string => {
  return localStorage.getItem("currencySymbol") || "BHD";
};

/**
 * Formats a number or string into a string with the correct decimal part.
 * Example: formatAmount(15.5) -> "15.500" (if decimalPart is 3)
 */
export const formatAmount = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  
  return num.toFixed(getDecimalPart());
};

/**
 * Formats a number or string into a currency string with the correct symbol and decimals.
 * Example: formatCurrency(25) -> "BHD 25.000" (if BHD and 3 decimals)
 */
export const formatCurrency = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === "") return "";
  const formattedAmount = formatAmount(value);
  const symbol = getCurrencySymbol();
  
  return `${symbol} ${formattedAmount}`;
};
