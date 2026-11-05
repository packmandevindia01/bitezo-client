import { unwrapData as unwrap } from "../../shared/api/unwrap";
import axiosInstance from "../../api/axiosInstance";
import type { AdminDashboardData, UserDashboardData } from "./types";

const getAdminDashboard = async (branchId: number, decimals: number): Promise<AdminDashboardData> => {
  return unwrap(
    axiosInstance.get(`/reports/${branchId}/admin-dashboard`, {
      params: { decimals },
    })
  );
};

const getUserDashboard = async (branchId: number, decimals: number): Promise<UserDashboardData> => {
  return unwrap(
    axiosInstance.get(`/reports/${branchId}/user-dashboard`, {
      params: { decimals },
    })
  );
};

export const dashboardApi = {
  getAdminDashboard,
  getUserDashboard,
};
