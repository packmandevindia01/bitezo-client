export interface ExtrasMasterForm {
  category: string;
  name: string;
  arabic: string;
  price: string;
  type: string;
  color: string;
  branch: string;
  isMultiCategory: boolean;
}

export interface ExtrasMasterRecord extends ExtrasMasterForm {
  id: number;
}
