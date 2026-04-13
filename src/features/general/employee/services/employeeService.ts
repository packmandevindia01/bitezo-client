import axiosInstance from "../api/axiosInstance";
import type {
  CreateEmployeePayload,
  EmployeeDetailResponse,
  EmployeeListResponse,
  UpdateEmployeePayload,
} from "../types/employeeApiTypes";

export interface BranchOption {
  branchId: number;
  branchName: string;
}

// ── List ──────────────────────────────────────────────────────────────────────
export const getEmployees = async (): Promise<EmployeeListResponse[]> => {
  const res = await axiosInstance.get("/employee/employee-list");
  return res.data.data ?? [];
};

// ── Single ────────────────────────────────────────────────────────────────────
export const getEmployeeById = async (
  empId: number
): Promise<EmployeeDetailResponse> => {
  const res = await axiosInstance.get(`/employee/${empId}/empid-data`);
  return res.data.data;
};

// ── Create ────────────────────────────────────────────────────────────────────
export const createEmployee = async (data: CreateEmployeePayload) => {
  const res = await axiosInstance.post("/employee", data);
  return res.data;
};

// ── Update ────────────────────────────────────────────────────────────────────
export const updateEmployee = async (
  empId: number,
  data: UpdateEmployeePayload
) => {
  const res = await axiosInstance.put(`/employee/${empId}`, data);
  return res.data;
};

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteEmployee = async (empId: number) => {
  const res = await axiosInstance.delete(`/employee/${empId}`);
  return res.data;
};

// ── Branches ──────────────────────────────────────────────────────────────────
export const getBranches = async (): Promise<BranchOption[]> => {
  const res = await axiosInstance.get("/Branch/list-name");
  return res.data?.data ?? [];
};