export interface ExtrasTypeForm {
  name: string;
  arabicName: string;
}

export interface ExtrasTypeRecord extends ExtrasTypeForm {
  typeId: number;
  updatedAt?: string;
  createdAt?: string;
}
