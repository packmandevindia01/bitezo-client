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
  sNo: number;
  name: string;
  arabic?: string;
  color?: string;
  typeId?: number;
  price?: number;
  branchIds?: number[];
  categoryIds?: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ModifierDetailResponse {
  modifier: {
    id: number;
    name: string;
    arabic: string;
    color: string;
    typeId: number;
    price: number;
    createdAt?: string;
    updatedAt?: string;
  }[];
  branchIds: {
    id: number;
    name: string;
  }[] | null;
  categoryIds: {
    id: number;
    name: string;
  }[] | null;
}
