export interface GroupForm {
  code: string;
  name: string;
}

export interface GroupRecord extends GroupForm {
  id: number;
}
