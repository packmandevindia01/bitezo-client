// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  correlationId: string;
  errors: ApiError[];
  isSuccess: boolean;
}

export interface ApiError {
  code: string;
  field: string | null;
  message: string;
}

// ─── Unit API Shapes ──────────────────────────────────────────────────────────

/** Shape returned by GET /api/unit/unit-list */
export interface UnitListItem {
  unitId: number;
  sNo: number;
  name: string;
  category: string;
  currentValue: number;
}

/** Shape returned by GET /api/unit/unit-listname */
export interface UnitNameListItem {
  unitId: number;
  name: string;
  currentValue: number;
}

/** Shape returned by GET /api/unit/{unitId}/unitid-data */
export interface UnitDetail {
  unitId: number;
  name: string;
  category: string;
  conversion: number;
  currentValue: number;
  parentId: number;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /api/unit */
export interface CreateUnitPayload {
  name: string;
  category: string;
  conversion: number;
  currentValue: number;
  parentId: number;
  createdAt: string;
}

/** Body for PUT /api/unit/{unitId} */
export interface UpdateUnitPayload {
  unitId: number;
  name: string;
  category: string;
  conversion: number;
  currentValue: number;
  parentId: number;
  updatedAt: string;
}

/** Response data for mutations */
export interface MutationResult {
  id: number;
}

// ─── UI / Form Shapes ─────────────────────────────────────────────────────────

/** Controlled form state */
export interface UnitFormState {
  name: string;
  category: string;
  conversion: number;
  currentValue: number;
  parentId: number;
}

/** Legacy type reference (if still needed externally) */
export interface UnitRecord extends UnitListItem {}
