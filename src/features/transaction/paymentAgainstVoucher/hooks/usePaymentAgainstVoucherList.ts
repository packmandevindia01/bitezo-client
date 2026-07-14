import { useQuery } from "@tanstack/react-query";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { useState } from "react";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const usePaymentAgainstVoucherList = (fromDate?: string, toDate?: string) => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const [searchBranchId, setSearchBranchId] = useState<number>(Number(initialBranchId));

  const listQuery = useQuery({
    queryKey: ["paymentAgainstVoucherList", searchBranchId, fromDate, toDate],
    queryFn: () => paymentAgainstVoucherApi.getPaymentAgainstVoucherList(searchBranchId, fromDate, toDate),
  });

  const branchQuery = useQuery({
    queryKey: ["branchList"],
    queryFn: () => branchApi.fetchBranchNames(),
  });

  return {
    records: listQuery.data || [],
    isLoading: listQuery.isLoading,
    branches: branchQuery.data || [],
    searchBranchId,
    setSearchBranchId,
    isBranchLocked,
  };
};
