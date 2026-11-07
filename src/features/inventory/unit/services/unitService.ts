import { unwrapCoded as unwrap } from "@shared/api/unwrap";
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


const firstNumber = (...values: unknown[]): number | undefined => {
  for (const v of values) {
    if (v === undefined || v === null || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/**
 * Parent-unit options from `/unit/unit-listname`. The response shape is not documented in Swagger, so the
 * id / name / value are read from every known field spelling. Without this, an item without `unitId`
 * gave the option value "undefined" and the wrong parent was saved. Items without a usable id are dropped.
 */
export const normalizeUnitNameList = (rows: unknown): UnitNameListItem[] =>
  (Array.isArray(rows) ? rows : [])
    .map((u: any) => ({
      unitId: firstNumber(u?.unitId, u?.UnitId, u?.unitID, u?.id, u?.Id, u?.ID) ?? 0,
      name: String(u?.name ?? u?.unitName ?? u?.UnitName ?? u?.Name ?? "").trim(),
      currentValue: firstNumber(u?.currentValue, u?.CurrentValue, u?.currentvalue) ?? 1,
    }))
    .filter((u) => u.unitId > 0);

/** A parent id that is safe to send: a positive whole number, else 0 (= base unit, no parent). */
export const toParentId = (value: unknown): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
};

/** The parent the backend actually stored for a unit (re-read after save). */
const readSavedParentId = (detail: any): number =>
  toParentId(firstNumber(detail?.parentId, detail?.ParentId, detail?.parentID, detail?.parentUnitId));

// ─── Unit Service ─────────────────────────────────────────────────────────────

export const unitService = {
  list(params?: { unitName?: string }): Promise<UnitListItem[]> {
    return unwrap(
      axiosInstance.get<ApiResponse<UnitListItem[]>>(`${BASE}/unit-list`, { params })
    );
  },

  async listFilteredNames(category: string, unitId: number = 0): Promise<UnitNameListItem[]> {
    const rows = await unwrap(
      axiosInstance.get<ApiResponse<UnitNameListItem[]>>(`${BASE}/unit-listname`, {
        params: { category, unitId }
      })
    );
    return normalizeUnitNameList(rows);
  },

  getById(unitId: number): Promise<UnitDetail> {
    return unwrap(
      axiosInstance.get<ApiResponse<UnitDetail>>(`${BASE}/${unitId}/unitid-data`)
    );
  },

  create(payload: CreateUnitPayload): Promise<MutationResult> {
    return unwrap(
      axiosInstance.post<ApiResponse<MutationResult>>(BASE, { ...payload, parentId: toParentId(payload.parentId) })
    );
  },

  update(unitId: number, payload: UpdateUnitPayload): Promise<MutationResult> {
    return unwrap(
      axiosInstance.put<ApiResponse<MutationResult>>(`${BASE}/${unitId}`, { ...payload, parentId: toParentId(payload.parentId) })
    );
  },

  remove(unitId: number): Promise<MutationResult> {
    return unwrap(axiosInstance.delete<ApiResponse<MutationResult>>(`${BASE}/${unitId}`));
  },

  /**
   * After a save, read the unit back and compare its parent with the one we sent.
   * Returns null when they match (or the unit cannot be read); otherwise the stored parent id,
   * so the caller can warn — that would be the BACKEND storing a different parent.
   */
  async verifySavedParent(unitId: number, sentParentId: number): Promise<number | null> {
    if (!(unitId > 0)) return null;
    try {
      const saved = await unitService.getById(unitId);
      const stored = readSavedParentId(saved);
      const expected = toParentId(sentParentId);
      if (stored === expected) return null;
      console.error("[unit] Parent unit mismatch after save", { unitId, sentParentId: expected, storedParentId: stored, saved });
      return stored;
    } catch {
      return null;
    }
  },
} as const;
