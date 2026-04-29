/**
 * Normalizes a value to a valid number of decimal places (between 0 and 6)
 */
export const normalizeDecimalPart = (value: number | string | undefined | null): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 2;
  return Math.min(Math.max(Math.trunc(parsed), 0), 6);
};

/**
 * Returns the configured decimal part from localStorage (fallback for non-hook usage)
 */
export const getDecimalPart = (): number => {
  return normalizeDecimalPart(localStorage.getItem("decimalPart"));
};

/**
 * Returns the configured currency symbol from localStorage (fallback for non-hook usage)
 */
export const getCurrencySymbol = (): string => {
  return localStorage.getItem("currencySymbol") || "BHD";
};

/**
 * Formats a number or string into a string with the correct decimal part.
 * Example: formatAmount(15.5, 3) -> "15.500"
 */
export const formatAmount = (value: number | string | undefined | null, decimalPart = getDecimalPart()): string => {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  
  return num.toFixed(normalizeDecimalPart(decimalPart));
};

/**
 * Formats a number or string into a currency string with the correct symbol and decimals.
 */
export const formatCurrency = (value: number | string | undefined | null, decimalPart = getDecimalPart(), symbol = getCurrencySymbol()): string => {
  if (value === undefined || value === null || value === "") return "";
  return `${symbol} ${formatAmount(value, decimalPart)}`;
};

/**
 * Validates if an input string is a valid amount based on decimal constraints.
 */
export const sanitizeAmountInput = (value: string, decimalPart = getDecimalPart()): string | null => {
  const decimals = normalizeDecimalPart(decimalPart);
  // Allow empty string for clearing inputs
  if (value === "") return "";
  
  // Regex for digits followed by optional dot and limited decimal places
  const pattern = decimals === 0
    ? /^\d*$/
    : new RegExp(`^\\d*(?:\\.\\d{0,${decimals}})?$`);

  return pattern.test(value) ? value : null;
};
