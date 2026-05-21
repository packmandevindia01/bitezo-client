// --- From employeeApiTypes.ts ---
export interface CreateEmployeePayload {
  code: string;
  name: string;
  branchId: number;
  isDriver: boolean;
  isMaster: boolean;
  isActive: boolean;
}

export interface UpdateEmployeePayload {
  empId: number;
  empCode: string;
  empName: string;
  branchId: number;
  isDriver: boolean;
  isActive: boolean;
  isMaster: boolean;
  updatedAt: string;
}

export interface EmployeeDetailResponse {
  empId: number;
  empCode: string;
  empName: string;
  branchId: number;
  isDriver: boolean;
  isActive: boolean;
  isMaster: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResponse {
  empId: number;
  empCode: string;
  empName: string;
  branchId: number;
  branch: string;
  isActive: string;
}

// --- From types.ts ---
export interface EmployeeRecord {
  id: number;
  name: string;
  code: string;
  branch: string;
  branchId?: number;
  driver: boolean;
  active: boolean;
  isMaster: boolean;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface ValidateEmployeePasswordRequest {
  password: string;
}

export interface ValidateEmployeePasswordData {
  employeeId: number;
  hasPrivilege: boolean;
}

export interface ValidateEmployeePasswordResponse {
  data: ValidateEmployeePasswordData;
  status: number;
  message: string;
  correlationId?: string;
  errors?: string[];
  isSuccess: boolean;
}

