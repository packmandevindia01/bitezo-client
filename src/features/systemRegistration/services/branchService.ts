import axiosInstance from "../../../api/axiosInstance";
import type { BranchOption } from "../types";



export const fetchBranches = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<Record<string, unknown>[]>("/Branch/true/list-name");

  const data = response.data ?? [];

  return data.map((b: any) => ({
    id: b.branchId ?? b.id ?? 0,
    name: b.branchName ?? b.name ?? "Unknown",
  }));
};
