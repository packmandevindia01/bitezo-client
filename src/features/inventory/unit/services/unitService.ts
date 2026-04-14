import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  CreateUnitPayload,
  MutationResult,
  UnitDetail,
  UnitListItem,
  UnitNameListItem,
  UpdateUnitPayload,
} from "../types";

// ─── Base ─────────────────────────────────────────────────────────────────────

const BASE = "/unit";

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

// ─── Unit Service ─────────────────────────────────────────────────────────────

export const unitService = {
  list(params?: { unitName?: string }): Promise<UnitListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<UnitListItem[]>>(`${BASE}/unit-list`, { params })
    );
  },

  listFilteredNames(category: string, unitId: number = 0): Promise<UnitNameListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<UnitNameListItem[]>>(`${BASE}/unit-listname`, { 
        params: { category, unitId } 
      })
    );
  },

  getById(unitId: number): Promise<UnitDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<UnitDetail>>(`${BASE}/${unitId}/unitid-data`)
    );
  },

  create(payload: CreateUnitPayload): Promise<MutationResult> {
    return unwrap(axiosInstance.post<ApiResponse<MutationResult>>(BASE, payload));
  },

  update(unitId: number, payload: UpdateUnitPayload): Promise<MutationResult> {
    return unwrap(axiosInstance.put<ApiResponse<MutationResult>>(`${BASE}/${unitId}`, payload));
  },

  remove(unitId: number): Promise<MutationResult> {
    return unwrap(axiosInstance.delete<ApiResponse<MutationResult>>(`${BASE}/${unitId}`));
  },
} as const;
