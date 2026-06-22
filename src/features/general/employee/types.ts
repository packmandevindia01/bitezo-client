import { z } from "zod";

// --- From employeeApiTypes.ts ---
export interface CreateEmployeePayload {
  code: string;
  name: string;
  branchId: number;
  isDriver: boolean;
  isMaster: boolean;
  isActive: boolean;
  roleId: number;
}

export interface UpdateEmployeePayload {
  empId: number;
  empCode: string;
  empName: string;
  branchId: number;
  isDriver: boolean;
  isActive: boolean;
  isMaster: boolean;
  roleId: number;
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
  roleId: number;
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

export interface EmployeeRoleOption {
  roleId: number;
  roleName: string;
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
  roleId: number;
}

export interface BranchOption {
  branchId: number;
  branchName: string;
}

export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  branchId: z.string().min(1, "Branch is required"),
  roleId: z.string().min(1, "Role is required"),
  driver: z.boolean().default(false),
  active: z.boolean().default(true),
  isMaster: z.boolean().default(false),
});

export type EmployeeForm = z.infer<typeof employeeSchema>;

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

