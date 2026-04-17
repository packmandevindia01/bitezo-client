export interface ExtrasMasterForm {
  name: string;
  arabic: string;
  price: string;
  typeId: string; // From ExtrasType
  color: string;
  branchIds: number[];
  categoryIds: number[];
  category: string; // Kept for future use
}

export interface ExtrasMasterRecord {
  id: number;
  name: string;
  arabic?: string;
  color?: string;
  typeId?: number;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  branchIds?: number[];
  categoryIds?: number[];
}
