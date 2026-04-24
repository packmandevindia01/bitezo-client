import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../product/types";
import type { BranchPayload, BranchRecord } from "../types";
import { 
  buildRequestBody, 
  mapResponseToBranch, 
  type BranchRequestBody 
} from "./branch-mappers";

// ─── Internal Interface ───────────────────────────────────────────────────────

interface BranchIdResponse {
  id?: number;
}

interface BranchListItem {
  branchId?: number;
  branchName?: string;
  isActive?: boolean;
}

// ─── Exported API functions ───────────────────────────────────────────────────

export const fetchBranchNames = async (allStatus: boolean = false): Promise<BranchRecord[]> => {
  const { data } = await axiosInstance.get<ApiResponse<BranchListItem[]>>(`/Branch/${allStatus}/list-name`);

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load branches");
  }

  return Array.isArray(data.data)
    ? data.data.map((item) => ({
        id: item.branchId ?? 0,
        branchName: item.branchName ?? "",
        isActive: item.isActive === true || String(item.isActive).toLowerCase() === "active",
        lines: [],
        detailsLoaded: false,
      }))
    : [];
};

export const fetchBranches = async (): Promise<BranchRecord[]> => {
  const { data } = await axiosInstance.get<ApiResponse<BranchListItem[]>>("/Branch/list");

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to load branch list");
  }

  return Array.isArray(data.data)
    ? data.data.map((item) => ({
        id: item.branchId ?? 0,
        sNo: (item as any).sNo,
        branchName: item.branchName ?? "",
        isActive: item.isActive === true || String(item.isActive).toLowerCase() === "active",
        lines: [],
        detailsLoaded: false,
      }))
    : [];
};

export const createBranch = async (payload: BranchPayload): Promise<BranchRecord> => {
  const { data } = await axiosInstance.post<ApiResponse<BranchIdResponse>>("/Branch", buildRequestBody(payload));

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to create branch");
  }

  const id = data.data?.id;
  if (!id) throw new Error("Branch created, but no ID was returned by the server.");

  return {
    id,
    branchName: payload.branchName,
    isActive: payload.isActive,
    lines: payload.lines.map(l => ({ ...l })),
    detailsLoaded: true,
  };
};

export const updateBranch = async (
  branchId: number,
  payload: BranchPayload
): Promise<BranchRecord> => {
  const { data } = await axiosInstance.put<ApiResponse<unknown>>(`/Branch/${branchId}`, buildRequestBody(payload, branchId));

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to update branch");
  }

  return {
    id: branchId,
    branchName: payload.branchName,
    isActive: payload.isActive,
    lines: payload.lines.map(l => ({ ...l })),
    detailsLoaded: true,
  };
};

export const deleteBranch = async (branchId: number): Promise<void> => {
  const { data } = await axiosInstance.delete<ApiResponse<unknown>>(`/Branch/${branchId}`);

  if (!data.isSuccess) {
    throw new Error(data.message || "Failed to delete branch");
  }
};

export const fetchBranchById = async (branchId: number): Promise<BranchRecord> => {
  const { data } = await axiosInstance.get<ApiResponse<BranchRequestBody>>(`/Branch/${branchId}/branchid-data`);

  if (!data.isSuccess || !data.data) {
    throw new Error(data.message || "Failed to load branch details");
  }

  return mapResponseToBranch(branchId, data.data);
};

export const branchApi = {
  fetchBranchNames,
  fetchBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} as const;