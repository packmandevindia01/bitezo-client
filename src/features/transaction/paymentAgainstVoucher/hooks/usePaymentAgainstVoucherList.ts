import { useQuery } from "@tanstack/react-query";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId } from "../../../auth/store/authSlice";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { useState } from "react";

export const usePaymentAgainstVoucherList = (fromDate?: string, toDate?: string) => {
  const defaultBranchId = useAppSelector(selectActiveBranchId) || 0;
  const [searchBranchId, setSearchBranchId] = useState<number>(defaultBranchId);

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
  };
};
