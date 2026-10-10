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

export const fetchTerminals = async (branchId: string, companyId?: string | number): Promise<TerminalOption[]> => {
  const targetCompanyId = companyId ?? localStorage.getItem("companyId") ?? localStorage.getItem("onboardingCompanyId") ?? 0;
  const response = await axiosInstance.get<Record<string, unknown>[]>(`/Branch/${branchId}/${targetCompanyId}/onboard-list-terminal-id`);
  
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

export const updateTerminalStatus = async (
  branchId: string | number,
  terminalId: string | number,
  clientDb?: string
): Promise<{ isSuccess: boolean; message?: string }> => {
  const targetDb = clientDb || localStorage.getItem("tenantId") || "";
  const headers: Record<string, string> = {};
  if (targetDb) {
    headers["clientDb"] = targetDb;
  }

  try {
    const { data } = await axiosInstance.patch<any>(
      `/Branch/branches/${branchId}/terminals/${terminalId}/status`,
      {},
      { headers }
    );

    if (data && data.isSuccess === false) {
      throw new Error(data.message || "Failed to update terminal status");
    }

    return { isSuccess: true, message: data?.message };
  } catch (error: any) {
    const backendMessage =
      error?.response?.data?.message ||
      error?.response?.data?.title ||
      error?.message ||
      "The selected Terminal ID is already linked to another Machine";
    throw new Error(backendMessage);
  }
};
