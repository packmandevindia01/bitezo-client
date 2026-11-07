import { unwrapCoded as unwrap } from "@shared/api/unwrap";
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


// ─── Group Service ────────────────────────────────────────────────────────────

export const groupService = {
  list(params?: { groupCode?: string; groupName?: string }): Promise<GroupListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<GroupListItem[]>>(`${BASE}/group-list`, { params })
    );
  },

  getNextGroupCode(): Promise<string> {
    return unwrap(
      axiosInstance.get<ApiResponse<{ code: number }>>(`${BASE}/next-group-code`)
    ).then(data => data.code.toString());
  },

  getById(grpId: number): Promise<GroupDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<GroupDetail>>(`${BASE}/${grpId}/grpid-data`)
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