export interface ModifierForm {
  name: string;
  arabic: string;
  color: string;
  typeId: string;
  price: string;
  branchIds: number[];
  categoryIds: number[];
  category?: string; // Kept as placeholder
}

export interface ModifierRecord {
  id: number;
  name: string;
  arabic: string;
  color: string;
  typeId?: number;
  type_id?: number; // Backend inconsistent casing
  price: number;
  createdAt?: string;
  updatedAt?: string;
  modifiedAt?: string;
  branchIds?: number[];
  categoryIds?: number[];
  sNo?: number;
}
