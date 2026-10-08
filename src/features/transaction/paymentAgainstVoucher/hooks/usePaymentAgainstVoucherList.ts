import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentAgainstVoucherApi, formatDateOnly } from "../services/paymentAgainstVoucherApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export { formatDateOnly };

export const usePaymentAgainstVoucherList = (fromDate?: string, toDate?: string) => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const defaultBranchId = initialBranchId ? Number(initialBranchId) : 0;
  const [searchBranchId, setSearchBranchId] = useState<number>(defaultBranchId);

  const branchQuery = useQuery({
    queryKey: ["branchList"],
    queryFn: () => branchApi.fetchBranchNames(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (searchBranchId === 0 && branchQuery.data && branchQuery.data.length > 0) {
      setSearchBranchId(Number(branchQuery.data[0].id));
    }
  }, [searchBranchId, branchQuery.data]);

  const cleanFromDate = formatDateOnly(fromDate);
  const cleanToDate = formatDateOnly(toDate);

  const listQuery = useQuery({
    queryKey: ["paymentAgainstVoucherList", searchBranchId, cleanFromDate, cleanToDate],
    queryFn: () => paymentAgainstVoucherApi.getPaymentAgainstVoucherList(searchBranchId, cleanFromDate, cleanToDate),
    enabled: searchBranchId !== 0,
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
