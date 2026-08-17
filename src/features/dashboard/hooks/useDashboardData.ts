import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api";
import { useAppSelector } from "../../../app/hooks";
import { selectActiveBranchId, selectBranchId, selectDecimalPart } from "../../auth/store/authSlice";
import { usePermissions } from "../../../hooks/usePermissions";

export const useAdminDashboard = () => {
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const userBranchId = useAppSelector(selectBranchId);
  const branchId = activeBranchId || userBranchId || 1;
  const decimals = useAppSelector(selectDecimalPart) ?? 3;

  return useQuery({
    queryKey: ["adminDashboard", branchId, decimals],
    queryFn: () => dashboardApi.getAdminDashboard(branchId, decimals),
    enabled: true,
    retry: false,
  });
};

export const useUserDashboard = () => {
  const activeBranchId = useAppSelector(selectActiveBranchId);
  const userBranchId = useAppSelector(selectBranchId);
  const branchId = activeBranchId || userBranchId || 1;
  const decimals = useAppSelector(selectDecimalPart) ?? 3;

  return useQuery({
    queryKey: ["userDashboard", branchId, decimals],
    queryFn: () => dashboardApi.getUserDashboard(branchId, decimals),
    enabled: true,
    retry: false,
  });
};

export const useDashboardData = () => {
  const userRoles = useAppSelector((state) => state.auth.userRoles);
  const { hasPermission } = usePermissions();

  const activeBranchId = useAppSelector(selectActiveBranchId);
  const userBranchId = useAppSelector(selectBranchId);
  const branchId = activeBranchId || userBranchId || 1;
  const decimals = useAppSelector(selectDecimalPart) ?? 3;

  // Check explicit permission status in userRoles array (bypassing generic isMaster override for dashboard selection)
  const hasUserPerm = userRoles?.some(
    (r) => r.module === "User Dashboard" && (r.status === undefined || r.status === true)
  );
  const hasAdminPerm = userRoles?.some(
    (r) => r.module === "Admin Dashboard" && (r.status === undefined || r.status === true)
  );

  let targetMode: "admin" | "user" = "admin";

  if (hasUserPerm && !hasAdminPerm) {
    targetMode = "user";
  } else if (hasAdminPerm && !hasUserPerm) {
    targetMode = "admin";
  } else {
    // If neither or both exist in userRoles, check via hasPermission
    const isAdminDashboardAllowed = hasPermission("Admin Dashboard", "View");
    const isUserDashboardAllowed = hasPermission("User Dashboard", "View");
    targetMode = (isUserDashboardAllowed && !isAdminDashboardAllowed) ? ("user" as const) : ("admin" as const);
  }

  // 1. Primary Query
  const primaryQuery = useQuery({
    queryKey: [targetMode === "user" ? "userDashboard" : "adminDashboard", branchId, decimals],
    queryFn: () =>
      targetMode === "user"
        ? dashboardApi.getUserDashboard(branchId, decimals)
        : dashboardApi.getAdminDashboard(branchId, decimals),
    retry: false,
  });

  // 2. Fallback Query (if admin endpoint returns 403 or fails, load user dashboard data seamlessly)
  const fallbackQuery = useQuery({
    queryKey: ["userDashboardFallback", branchId, decimals],
    queryFn: () => dashboardApi.getUserDashboard(branchId, decimals),
    enabled: targetMode === "admin" && primaryQuery.isError,
    retry: false,
  });

  if (primaryQuery.isSuccess) {
    return { ...primaryQuery, mode: targetMode };
  }

  if (fallbackQuery.isSuccess) {
    return { ...fallbackQuery, mode: targetMode };
  }

  if (primaryQuery.isLoading || fallbackQuery.isLoading) {
    return {
      data: undefined,
      isLoading: true,
      isError: false,
      mode: targetMode,
    };
  }

  return { ...primaryQuery, mode: targetMode };
};
