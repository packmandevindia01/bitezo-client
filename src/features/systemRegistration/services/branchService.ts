import axiosInstance from "../../../api/axiosInstance";
import type { BranchOption } from "../types";
import type { TerminalOption } from "../types";



export const fetchBranches = async (): Promise<BranchOption[]> => {
  const response = await axiosInstance.get<Record<string, unknown>[]>("/Branch/true/list-name");

  const data = response.data ?? [];

  return data.map((b: any) => ({
    id: b.branchId ?? b.id ?? 0,
    name: b.branchName ?? b.name ?? "Unknown",
  }));
};

export const fetchTerminals = async (branchId: string): Promise<TerminalOption[]> => {
  const response = await axiosInstance.get<Record<string, unknown>[]>(`/Branch/${branchId}/onboard-list-terminal-id`);
  
  // The API returns { data: [...] } due to ApiResponse mapping, but we might have unwrapped it via axios interceptor. 
  // Wait, if it's not unwrapped, it's response.data.data? Let's check the JSON.
  // "data": [ { "terminalId": 1, "terminalName": "BITE-POS-1" } ]
  // In branchService fetchBranches we use `response.data ?? []`.
  const payload = (response as any).data ?? response;
  const data = Array.isArray(payload) ? payload : (payload.data ?? []);

  return data.map((t: any) => ({
    id: t.terminalId ?? t.id ?? 0,
    name: t.terminalName ?? t.name ?? "Unknown",
  }));
};
