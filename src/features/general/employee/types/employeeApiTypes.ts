export interface CreateEmployeePayload {
  code: string;
  name: string;
  branchId: number;
  isDriver: boolean;
  isMaster: boolean;
  isActive: boolean;
}

export interface EmployeeListResponse {
  empId: number;
  empCode: string;
  empName: string;
  branch: string;
  isActive: string;
}