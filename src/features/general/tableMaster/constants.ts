import type { TableForm, TableRecord } from "./types";

export const initialTables: TableRecord[] = [
  { id: 1, section: "Dining Hall", tableNo: "T1", chairs: 4, status: "Active" },
  { id: 2, section: "Dining Hall", tableNo: "T2", chairs: 4, status: "Active" },
  { id: 3, section: "Family Zone", tableNo: "T3", chairs: 6, status: "Inactive" },
  { id: 4, section: "Terrace", tableNo: "T4", chairs: 2, status: "Active" },
  { id: 5, section: "Terrace", tableNo: "T5", chairs: 4, status: "Active" },
];

export const sectionOptions = [
  { label: "Dining Hall", value: "Dining Hall" },
  { label: "Family Zone", value: "Family Zone" },
  { label: "Terrace", value: "Terrace" },
];

export const statusOptions = [
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export const emptyTableForm: TableForm = {
  section: "Dining Hall",
  tableNo: "",
  chairs: "",
  status: "Active",
};
