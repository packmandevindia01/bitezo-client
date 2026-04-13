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