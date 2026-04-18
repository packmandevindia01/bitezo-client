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

export interface ExtrasDetailResponse {
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
