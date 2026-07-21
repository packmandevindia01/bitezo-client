import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api";
import { useAppSelector } from "../../../app/hooks";
import { selectActiveBranchId, selectDecimalPart } from "../../auth/store/authSlice";

export const useAdminDashboard = () => {
  const branchId = useAppSelector(selectActiveBranchId);
  const decimals = useAppSelector(selectDecimalPart) ?? 3;

  return useQuery({
    queryKey: ["adminDashboard", branchId, decimals],
    queryFn: () => dashboardApi.getAdminDashboard(branchId as number, decimals),
    enabled: !!branchId,
  });
};
