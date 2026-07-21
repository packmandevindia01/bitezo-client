import axiosInstance from "../../api/axiosInstance";
const unwrap = async <T>(promise: Promise<{ data: { data: T } | T }>): Promise<T> => {
  const response = await promise;
  // Handle standard { data: { data: ... } } envelope
  if (response.data && "data" in (response.data as any)) {
    return (response.data as any).data;
  }
  return response.data as T;
};
import type { AdminDashboardData } from "./types";

const getAdminDashboard = async (branchId: number, decimals: number): Promise<AdminDashboardData> => {
  return unwrap(
    axiosInstance.get(`/reports/${branchId}/admin-dashboard`, {
      params: { decimals },
    })
  );
};

export const dashboardApi = {
  getAdminDashboard,
};
