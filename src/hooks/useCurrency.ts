import { useAppSelector } from "../app/hooks";
import { selectCurrencySymbol, selectDecimalPart } from "../features/auth/store/authSlice";
import { formatAmount, formatCurrency, sanitizeAmountInput } from "../utils/formatters";
import { useCallback } from "react";

/**
 * A centralized hook for handling all currency and decimal formatting.
 * This hook is reactive to the global Redux state, which is synced
 * with the Denomination Master.
 */
export const useCurrency = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const currencySymbol = useAppSelector(selectCurrencySymbol);

  const formatA = useCallback((value: number | string | undefined | null) => {
    return formatAmount(value, decimalPart);
  }, [decimalPart]);

  const formatC = useCallback((value: number | string | undefined | null) => {
    return formatCurrency(value, decimalPart, currencySymbol);
  }, [decimalPart, currencySymbol]);

  const sanitize = useCallback((value: string) => {
    return sanitizeAmountInput(value, decimalPart);
  }, [decimalPart]);

  return {
    decimalPart,
    currencySymbol,
    formatAmount: formatA,
    formatCurrency: formatC,
    sanitizeAmountInput: sanitize,
  };
};
