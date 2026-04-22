import type { TableForm } from "./types";

export const emptyTableForm: TableForm = {
  sectionId: "",
  tableName: "",
  chairs: "",
  isActive: true,
  position: 0,
};

export const statusOptions = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];
