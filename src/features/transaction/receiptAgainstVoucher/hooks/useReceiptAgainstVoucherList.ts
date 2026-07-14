import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { receiptAgainstVoucherApi } from "../services/receiptAgainstVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useReceiptAgainstVoucherList = (fromDate?: string, toDate?: string) => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [searchBranchId, setSearchBranchId] = useState<number>(Number(initialBranchId));

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
    isBranchLocked,
  };
};
