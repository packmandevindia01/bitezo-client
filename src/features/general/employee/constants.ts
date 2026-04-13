import type { EmployeeRecord } from "./types/types";

export const employeeBranchOptions = [
  { label: "Main Branch", value: "Main Branch" },
  { label: "Express Counter", value: "Express Counter" },
  { label: "Airport Outlet", value: "Airport Outlet" },
];

export const initialEmployees: EmployeeRecord[] = [
  {
    id: 1,
    name: "Akhil Raj",
    code: "EMP-001",
    branch: "Main Branch",
    driver: false,
    active: true,
    isMaster: true,
  },
  {
    id: 2,
    name: "Sneha Das",
    code: "EMP-002",
    branch: "Express Counter",
    driver: true,
    active: true,
    isMaster: false,
  },
];

export const emptyEmployeeForm = {
  name: "",
  code: "",
  branch: "",
  driver: false,
  active: true,
  isMaster: false,
};
