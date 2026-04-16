import axiosInstance from "../../../../api/axiosInstance";
import type {
  ApiResponse,
  CreateTaxPayload,
  MutationResult,
  TaxDetail,
  TaxListItem,
  TaxNameListItem,
  UpdateTaxPayload,
} from "../types";

// ─── Base ─────────────────────────────────────────────────────────────────────

const BASE = "/vat";

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

// ─── Tax Service ─────────────────────────────────────────────────────────────

export const taxService = {
  list(): Promise<TaxListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<TaxListItem[]>>(`${BASE}/vat-list`)
    );
  },

  listNames(): Promise<TaxNameListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<TaxNameListItem[]>>(`${BASE}/vat-listname`)
    );
  },

  getById(vatId: number): Promise<TaxDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<TaxDetail>>(`${BASE}/${vatId}/vatid-data`)
    );
  },

  create(payload: CreateTaxPayload): Promise<MutationResult> {
    return unwrap(axiosInstance.post<ApiResponse<MutationResult>>(BASE, payload));
  },

  update(vatId: number, payload: UpdateTaxPayload): Promise<MutationResult> {
    return unwrap(axiosInstance.put<ApiResponse<MutationResult>>(`${BASE}/${vatId}`, payload));
  },

  remove(vatId: number): Promise<MutationResult> {
    return unwrap(axiosInstance.delete<ApiResponse<MutationResult>>(`${BASE}/${vatId}`));
  },
} as const;
