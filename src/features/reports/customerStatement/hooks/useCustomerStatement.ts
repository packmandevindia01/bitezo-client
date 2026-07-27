import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { fetchCustomerStatement } from "../services/customerStatementApi";
import { getBranchList, getCustomerList } from "../../billWiseMarginReport/services/billWiseMarginReportApi";

export const useCustomerStatement = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { initialBranchId, isBranchLocked } = useBranchScope();

  // 1. Setup our Filter States
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

  // 3. Fetch The Statement Report Data!
  const { data: reportResponse, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["CustomerStatement", { fromDate, toDate, branchId, customerId, decimalPart }],
    queryFn: () => fetchCustomerStatement({
      BranchId: Number(branchId),
      FromDate: fromDate,
      ToDate: toDate,
      CustomerId: Number(customerId),
      Decimals: decimalPart !== undefined ? decimalPart : 3,
    }),
  });

  // Reset Filters Function
  const resetFilters = () => {
    const today = new Date();
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(today.toISOString().split("T")[0]);
    setBranchId(initialBranchId);
    setCustomerId("0");
  };

  return {
    filters: {
      fromDate, setFromDate,
      toDate, setToDate,
      branchId, setBranchId, isBranchLocked,
      customerId, setCustomerId,
      resetFilters,
    },
    masterData: {
      branches, branchesLoading,
      customers, customersLoading,
    },
    report: {
      // Access the inner "data" array from the CustomerStatementResponse
      statementData: reportResponse?.data || [],
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
