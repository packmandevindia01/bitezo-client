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
  flatNo?: string;
  buildingNo?: string;
  blockNo?: string;
  roadNo?: string;
  callType?: string;
  identityNo: string;
  trnNo: string;
  branch: string;
  openingBalance: string;
  isActive: boolean;
}

export interface CustomerResponse {
  customer: Customer[];
}

export interface CustomerPayloadDetail {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  amount: number;
  baseQty: number;
  typeId: number;
  effect: string;
}
