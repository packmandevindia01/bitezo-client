import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { allTransactionReportApi } from "../services/allTransactionReportApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { getDecimalPart } from "../../../../utils/currency";

export const useAllTransactionReport = () => {
  // Setup default dates (start of month to today)
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultFromDate = startOfMonth.toISOString().split("T")[0];
  const defaultToDate = today.toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [branchId, setBranchId] = useState("0");

  const decimalPart = getDecimalPart();

  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.fetchBranchNames(true),
    staleTime: 5 * 60 * 1000
  });

  // Fetch report data
  const { data: reportData = [], isLoading, isFetching } = useQuery({
    queryKey: ["allTransactionReport", branchId, fromDate, toDate, decimalPart],
    queryFn: () =>
      allTransactionReportApi.getAllTransactionReport({
        BranchId: Number(branchId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
  });

  const handleReset = () => {
    setFromDate(defaultFromDate);
    setToDate(defaultToDate);
    setBranchId("0");
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
  };
};
