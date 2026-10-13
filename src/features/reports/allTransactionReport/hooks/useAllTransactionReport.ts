import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { allTransactionReportApi } from "../services/allTransactionReportApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { subscribeToTransactionUpdates } from "../../../../utils/transactionSync";

export const useAllTransactionReport = () => {
  const queryClient = useQueryClient();
  // Setup default dates (start of month to today)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultFromDate = startOfMonth.toISOString().split("T")[0];
  const defaultToDate = today.toISOString().split("T")[0];

  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [branchId, setBranchId] = useState(initialBranchId || "1");

  const decimalPart = getDecimalPart();

  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.fetchBranchNames(true),
    staleTime: 5 * 60 * 1000
  });

  // Fetch report data
  // gcTime: 0 ensures cached data is discarded immediately when the component unmounts
  // (e.g. navigating to POS), so returning to this page always triggers a fresh API call
  // instead of briefly serving stale data from cache.
  const { data: reportData = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["allTransactionReport", branchId, fromDate, toDate, decimalPart],
    queryFn: () =>
      allTransactionReportApi.getAllTransactionReport({
        BranchId: Number(branchId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });

  // Real-time synchronization: recall API whenever any transaction entry occurs (POS sales, purchases, returns, vouchers, etc.)
  useEffect(() => {
    return subscribeToTransactionUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["allTransactionReport"] });
      void queryClient.refetchQueries({ queryKey: ["allTransactionReport"] });
    });
  }, [queryClient]);

  // Auto-refresh when user returns to this tab or window gains focus
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === "visible") {
        void queryClient.invalidateQueries({ queryKey: ["allTransactionReport"] });
        void queryClient.refetchQueries({ queryKey: ["allTransactionReport"] });
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", handleSync);
    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleSync);
    };
  }, [queryClient]);

  const handleReset = () => {
    setFromDate(defaultFromDate);
    setToDate(defaultToDate);
    if (!isBranchLocked) {
      setBranchId("1");
    }
    setTimeout(() => {
      refetch();
    }, 0);
  };

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
    },
    branches,
    reportData,
    isLoading: isLoading || isFetching,
    handleReset,
    refetch,
    isBranchLocked,
  };
};
