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

// ─── Tax (VAT) API Shapes ─────────────────────────────────────────────────────

/** Shape returned by GET /api/vat/vat-list */
export interface TaxListItem {
  id: number;
  sNo: number;
  name: string;
  value: number;
}

/** Shape returned by GET /api/vat/vat-listname */
export interface TaxNameListItem {
  id: number;
  name: string;
  value: number;
}

/** Shape returned by GET /api/vat/{vatId}/vatid-data */
export interface TaxDetail {
  id: number;
  name: string;
  value: number;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /api/vat */
export interface CreateTaxPayload {
  name: string;
  value: number;
  expireAt: string;
  createdAt: string;
}

/** Body for PUT /api/vat/{vatId} */
export interface UpdateTaxPayload {
  id: number;
  name: string;
  value: number;
  expireAt: string;
  updatedAt: string;
}

/** Response data for mutations */
export interface MutationResult {
  id: number;
}

// ─── UI / Form Shapes ─────────────────────────────────────────────────────────

/** Controlled form state */
export interface TaxFormState {
  name: string;
  value: string; // Use string for input handling, convert to number on submit
  expireAt: string;
}
