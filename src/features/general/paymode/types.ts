export interface PaymodeRecord {
  id: number;
  paymode: string;
  branch: string;
  counter: string;
}

export interface PaymodeForm {
  id: string;
  paymode: string;
  branch: string;
  counter: string;
}
