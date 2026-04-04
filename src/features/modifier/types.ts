export interface ModifierForm {
  category: string;
  name: string;
  arabic: string;
  color: string;
  branch: string;
  isMultiCategory: boolean;
}

export interface ModifierRecord extends ModifierForm {
  id: number;
}
