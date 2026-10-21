import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { fetchCustomerBalance } from "../services/customerBalanceApi";
import { getBranchList, getCustomerList } from "../../billWiseMarginReport/services/billWiseMarginReportApi";

export const useCustomerBalance = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { initialBranchId, isBranchLocked } = useBranchScope();

  // 1. Setup Filter States
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [customerId, setCustomerId] = useState<string>("0");

  // 2. Fetch Dropdown Options (Master Data)
  const { data: branches = [] as any[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: customers = [] as any[], isLoading: customersLoading } = useQuery({
    queryKey: ["CustomerList", "all"],
    queryFn: getCustomerList,
  });

  // 3. Fetch Customer Balance Report Data
  const { data: reportResponse, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["CustomerBalance", { fromDate, toDate, branchId, customerId, decimalPart }],
    queryFn: () => fetchCustomerBalance({
      BranchId: Number(branchId),
      FromDate: fromDate,
      ToDate: toDate,
      CustomerId: Number(customerId),
      Decimals: decimalPart !== undefined ? decimalPart : 3,
    }),
    staleTime: 0,
    refetchOnMount: true,
  });

  // Reset Filters Function
  const resetFilters = () => {
    const today = new Date();
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
    setBranchId(initialBranchId);
    setCustomerId("0");
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
      isBranchLocked,
      customerId,
      setCustomerId,
      resetFilters,
    },
    masterData: {
      branches,
      branchesLoading,
      customers,
      customersLoading,
    },
    report: {
      summaryData: reportResponse?.data?.summaryData || [],
      totalData: reportResponse?.data?.totalData || { total: "0" },
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
