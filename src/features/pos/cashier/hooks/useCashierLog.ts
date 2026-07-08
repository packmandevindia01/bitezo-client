import { useQuery } from "@tanstack/react-query";
import {
  cashierLogService,
  type CashierStatusResponse,
} from "../services/cashierLogService";

export const useCashierLog = () => {
  const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
  const counterId = Number(localStorage.getItem("systemCounterId")) || 0;

  const { data, isLoading, error, refetch } = useQuery<CashierStatusResponse, Error>({
    queryKey: ["cashierStatus", branchId, counterId],
    queryFn: () => cashierLogService.checkStatus(branchId, counterId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const status = data?.cashierInStatus ?? null;
  const errorMsg = error ? (error.message || "Failed to check cashier status") : null;

  // Convenience derived values
  const isSessionOpen =
    status !== null && !status.isDayClosed && !status.isShiftClosed;

  return {
    statusResponse: data ?? null,   // full response with tokens, company, user
    status,           // just the cashierInStatus nested object
    isLoading,
    error: errorMsg,
    isSessionOpen,
    refreshStatus: refetch,
  };
};