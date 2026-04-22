export interface TableRecord {
  tableId: number;
  tableName: string;
  chairs: number;
  isActive: boolean;
  position: number;
}

export interface TableDetail extends TableRecord {
  sectionId: number;
}

export interface TableForm {
  sectionId: string;
  tableName: string;
  chairs: string;
  isActive: boolean;
  position: number;
}

export interface TablePayload {
  tableId?: number;
  tableName: string;
  chairs: number;
  isActive: boolean;
  sectionId: number;
  position: number;
}
