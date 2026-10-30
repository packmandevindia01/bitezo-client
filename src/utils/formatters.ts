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

export const roundToDecimals = (
  value: number | string | undefined | null,
  decimals = getDecimalPart()
): number => {
  const num = typeof value === "string" ? parseFloat(value) : Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  if (num === 0) return 0;
  const d = normalizeDecimalPart(decimals);
  const factor = Math.pow(10, d);
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  return sign * (Math.round((abs + 1e-11) * factor) / factor);
};

/**
 * Formats a number or string into a string with the correct decimal part.
 * Example: formatAmount(15.5, 3) -> "15.500"
 */
export const formatAmount = (value: number | string | undefined | null, decimalPart = getDecimalPart()): string => {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  const d = normalizeDecimalPart(decimalPart);
  return roundToDecimals(num, d).toFixed(d);
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
