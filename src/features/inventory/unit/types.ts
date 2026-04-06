export interface UnitForm {
  category: string;
  name: string;
  parentUnit: string;
  conversion: string;
}

export interface UnitRecord extends UnitForm {
  id: number;
}
