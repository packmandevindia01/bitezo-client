import axiosInstance from "../../../api/axiosInstance";
import type { BranchOption } from "../types";

interface BranchListItem {
  branchId?: number;
  id?: number;
  branchName?: string;
  name?: string;
}

export const fetchBranches = async (): Promise<BranchOption[]> => {
  const clientDb = localStorage.getItem("tenantId") ?? "";
  const response = await axiosInstance.get<BranchListItem[]>(
    `/Branch/list-name?clientDb=${encodeURIComponent(clientDb)}`
  );

  const data = response.data ?? [];

  return data.map((b) => ({
    id: b.branchId ?? b.id ?? 0,
    name: b.branchName ?? b.name ?? "Unknown",
  }));
};
