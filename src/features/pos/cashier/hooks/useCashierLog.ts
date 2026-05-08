import { useState, useEffect, useCallback } from "react";
import {
  cashierLogService,
  type CashierInStatus,
  type CashierStatusResponse,
} from "../services/cashierLogService";

export const useCashierLog = () => {
  const [statusResponse, setStatusResponse] = useState<CashierStatusResponse | null>(null);
  const [status, setStatus] = useState<CashierInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
      const counterId = Number(localStorage.getItem("systemCounterId")) || 0;

      const response = await cashierLogService.checkStatus(branchId, counterId);
      setStatusResponse(response);
      setStatus(response.cashierInStatus); // ← pull out the nested status
    } catch (err: any) {
      setError(err.message || "Failed to check cashier status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Convenience derived values
  const isSessionOpen =
    status !== null && !status.isDayClosed && !status.isShiftClosed;

  return {
    statusResponse,   // full response with tokens, company, user
    status,           // just the cashierInStatus nested object
    isLoading,
    error,
    isSessionOpen,
    refreshStatus: checkStatus,
  };
};