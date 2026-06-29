import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { receiptAgainstVoucherApi } from "../services/receiptAgainstVoucherApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId } from "../../../auth/store/authSlice";
import { branchApi } from "../../../inventory/branches/services/branchApi";

export const useReceiptAgainstVoucherList = (fromDate?: string, toDate?: string) => {
  const globalBranchId = useAppSelector(selectActiveBranchId) || Number(localStorage.getItem("branchId")) || 0;
  const [searchBranchId, setSearchBranchId] = useState<number>(globalBranchId);

  useEffect(() => {
    if (globalBranchId > 0 && searchBranchId === 0) {
      setSearchBranchId(globalBranchId);
    }
  }, [globalBranchId]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.fetchBranchNames(),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["receiptAgainstVoucherList", searchBranchId, fromDate, toDate],
    queryFn: () => receiptAgainstVoucherApi.getReceiptAgainstVoucherList(searchBranchId, fromDate, toDate),
    enabled: searchBranchId > 0,
    retry: false,
  });

  return {
    records,
    isLoading,
    branches,
    searchBranchId,
    setSearchBranchId,
  };
};
