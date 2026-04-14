import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  CreateGroupPayload,
  GroupDetail,
  GroupListItem,
  MutationResult,
  UpdateGroupPayload,
} from "../types";

// ─── Base ─────────────────────────────────────────────────────────────────────

const BASE = "/group";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;

  if (!envelope.isSuccess) {
    const msg =
      envelope.errors?.[0]?.message ?? envelope.message ?? "An unexpected error occurred.";
    const err = new Error(msg) as Error & { code?: string; apiStatus?: number };
    err.code = envelope.errors?.[0]?.code;
    err.apiStatus = envelope.status;
    throw err;
  }

  return envelope.data;
}

// ─── Group Service ────────────────────────────────────────────────────────────

export const groupService = {
  list(params?: { groupCode?: string; groupName?: string }): Promise<GroupListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<GroupListItem[]>>(`${BASE}/group-list`, { params })
    );
  },

  getById(grpId: number): Promise<GroupDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<GroupDetail>>(`${BASE}/${grpId}/subcatid-data`)
    );
  },

  create(payload: CreateGroupPayload): Promise<MutationResult> {
    return unwrap(axiosInstance.post<ApiResponse<MutationResult>>(BASE, payload));
  },

  update(grpId: number, payload: UpdateGroupPayload): Promise<MutationResult> {
    return unwrap(axiosInstance.put<ApiResponse<MutationResult>>(`${BASE}/${grpId}`, payload));
  },

  remove(grpId: number): Promise<MutationResult> {
    return unwrap(axiosInstance.delete<ApiResponse<MutationResult>>(`${BASE}/${grpId}`));
  },
} as const;