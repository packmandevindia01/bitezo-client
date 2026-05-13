export interface Customer {
  id?: number;
  customerCode: string;
  customerName: string;
  arabicName: string;
  mobileNo: string;
  telNo: string;
  email: string;
  address: string;
  area: string;
  identityNo: string;
  trnNo: string;
  branch: string;
  openingBalance: string;
  isActive: boolean;
}

export interface CustomerResponse {
  customer: Customer[];
}
