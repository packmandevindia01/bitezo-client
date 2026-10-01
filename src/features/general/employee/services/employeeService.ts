import axiosInstance from "../../../../api/axiosInstance";
import type {
  CreateEmployeePayload,
  EmployeeDetailResponse,
  EmployeeListResponse,
  UpdateEmployeePayload,
  BranchOption,
  EmployeeRoleOption,
  ValidateEmployeePasswordResponse,
} from "../types";

export type { BranchOption };

// ── List ──────────────────────────────────────────────────────────────────────
export const getEmployees = async (): Promise<EmployeeListResponse[]> => {
  const res = await axiosInstance.get("/employee/employee-list");
  if (res.data && res.data.isSuccess === false) {
    console.warn("[employeeService] getEmployees reported failure:", res.data.message);
    return [];
  }
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data ?? [];
};

export const getEmployeeNames = async (branchId?: number): Promise<{empId: number, empName: string}[]> => {
  const url = branchId ? `/employee/list-name?branchId=${branchId}` : "/employee/list-name";
  const res = await axiosInstance.get(url);
  if (res.data && res.data.isSuccess === false) {
    return [];
  }
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data ?? [];
};

export const getDrivers = async (branchId: number): Promise<{driverId: number, driverName: string}[]> => {
  const res = await axiosInstance.get(`/employee/${branchId}/drivers`);
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

// ── Single ────────────────────────────────────────────────────────────────────
export const getEmployeeById = async (
  empId: number
): Promise<EmployeeDetailResponse> => {
  const res = await axiosInstance.get(`/employee/${empId}/empid-data`);
  if (res.data && res.data.isSuccess === false) {
    throw new Error(res.data.message || "Failed to fetch employee details");
  }
  return res.data?.data ?? res.data;
};

// ── Create ────────────────────────────────────────────────────────────────────
export const createEmployee = async (data: CreateEmployeePayload) => {
  const res = await axiosInstance.post("/employee", data);
  if (res.data && res.data.isSuccess === false) {
    throw new Error(res.data.message || "Failed to create employee");
  }
  return res.data;
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateEmployee = async (
  empId: number,
  data: UpdateEmployeePayload
) => {
  const res = await axiosInstance.put(`/employee/${empId}`, data);
  if (res.data && res.data.isSuccess === false) {
    throw new Error(res.data.message || "Failed to update employee");
  }
  return res.data;
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteEmployee = async (empId: number) => {
  const res = await axiosInstance.delete(`/employee/${empId}`);
  if (res.data && res.data.isSuccess === false) {
    throw new Error(res.data.message || "Failed to delete employee");
  }
  return res.data;
};

// ── Branches ──────────────────────────────────────────────────────────────────
export const getBranches = async (): Promise<BranchOption[]> => {
  const res = await axiosInstance.get("/Branch/false/list-name");
  return res.data?.data ?? [];
};

export const getEmployeeRoles = async (): Promise<EmployeeRoleOption[]> => {
  const res = await axiosInstance.get("/EmployeeRole/employee-role-listname");
  return res.data?.data ?? [];
};

export const validateEmployeePassword = async (
  password: string,
  permissionId?: number
): Promise<ValidateEmployeePasswordResponse> => {
  const res = await axiosInstance.post("/employee/validate-password", { password, permissionId });
  return res.data;
};

export const employeeService = {
  getEmployees,
  getEmployeeNames,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getBranches,
  validateEmployeePassword,
  getDrivers,
} as const;
