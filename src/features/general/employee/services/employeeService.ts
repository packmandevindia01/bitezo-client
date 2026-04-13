import axiosInstance from "../api/axiosInstance";
import type { CreateEmployeePayload, EmployeeListResponse } from "../types/employeeApiTypes";

export const createEmployee = async (data: CreateEmployeePayload) => {
  const res = await axiosInstance.post("/employee", data);
  return res.data;
};

export const getEmployees = async () => {
  const res = await axiosInstance.get("/employee/employee-list");
  return res.data.data as EmployeeListResponse[];
};