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

// ─── Group API Shapes ─────────────────────────────────────────────────────────

/** Shape returned by GET /api/group/group-list */
export interface GroupListItem {
  grpId: number;
  sNo: number;
  code: string;
  name: string;
  isActive: "Active" | "Inactive";
}

/** Shape returned by GET /api/group/{grpId}/subcatid-data */
export interface GroupDetail {
  grpId: number;
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /api/group */
export interface CreateGroupPayload {
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
  createdAt: string;
}

/** Body for PUT /api/group/{grpId} */
export interface UpdateGroupPayload {
  grpId: number;
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
  updatedAt: string;
}

/** Response data for create / update / delete */
export interface MutationResult {
  id: number;
}

// ─── UI / Form Shapes ─────────────────────────────────────────────────────────

/** Controlled form state (what the user edits) */
export interface GroupForm {
  code: string;
  name: string;
  arabicName: string;
  isActive: boolean;
}

/** Row displayed in the table */
export interface GroupRecord {
  grpId: number;
  sNo: number;
  code: string;
  name: string;
  isActive: "Active" | "Inactive";
}