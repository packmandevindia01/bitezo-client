import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMonthlySalesReport } from "../services/monthlySalesReportApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useMonthlySalesReport = () => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [branchId, setBranchId] = useState<string>(initialBranchId || "1"); // Default to All

  const currentYear = new Date().getFullYear();
  
  // YYYY-MM string for native month input
  const [fromPeriod, setFromPeriod] = useState<string>(`${currentYear}-01`);
  const [toPeriod, setToPeriod] = useState<string>(`${currentYear}-12`);

  const { data: branches = [] } = useQuery({
    queryKey: ["activeBranches"],
    queryFn: () => branchApi.fetchBranchNames(true),
    staleTime: 5 * 60 * 1000,
  });

  const fromYear = parseInt(fromPeriod.split("-")[0] || String(currentYear), 10);
  const fromMonth = parseInt(fromPeriod.split("-")[1] || "1", 10);
  const toYear = parseInt(toPeriod.split("-")[0] || String(currentYear), 10);
  const toMonth = parseInt(toPeriod.split("-")[1] || "12", 10);

  const { data: reportData, isLoading, isFetching } = useQuery({
    queryKey: [
      "monthlySalesReport",
      branchId,
      fromMonth,
      fromYear,
      toMonth,
      toYear,
    ],
    queryFn: () =>
      getMonthlySalesReport({
        BranchId: parseInt(branchId, 10) || 0,
        FromMonth: fromMonth,
        FromYear: fromYear,
        ToMonth: toMonth,
        ToYear: toYear,
        Decimals: getDecimalPart(),
      }),
    enabled: !!fromPeriod && !!toPeriod,
    refetchOnWindowFocus: false,
  });

  const handleReset = useCallback(() => {
    if (!isBranchLocked) {
      setBranchId("1");
    }
    setFromPeriod(`${currentYear}-01`);
    setToPeriod(`${currentYear}-12`);
  }, [currentYear, isBranchLocked]);

  const filters = useMemo(
    () => ({
      branchId,
      setBranchId,
      fromPeriod,
      setFromPeriod,
      toPeriod,
      setToPeriod,
      isBranchLocked,
    }),
    [branchId, fromPeriod, toPeriod, isBranchLocked]
  );

  return {
    filters,
    branches,
    reportData,
    isLoading: isLoading || isFetching,
    handleReset,
  };
};
