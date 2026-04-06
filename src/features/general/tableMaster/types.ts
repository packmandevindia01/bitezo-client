export interface TableRecord {
  id: number;
  section: string;
  tableNo: string;
  chairs: number;
  status: "Active" | "Inactive";
}

export interface TableForm {
  section: string;
  tableNo: string;
  chairs: string;
  status: "Active" | "Inactive";
}
