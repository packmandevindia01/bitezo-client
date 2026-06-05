export interface Supplier {
  id: number;
  code: string;
  name: string;
  arabicName?: string;
  mobileNo?: string;
  telNo?: string;
  email?: string;
  address?: string;
  area?: string;
  identityNo?: string;
  trnNo?: string;
  branchId: number;
  branchName?: string;
  openingBalance: number;
  isActive: boolean;
  statusLabel?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierPayload {
  code: string;
  name: string;
  arabicName: string;
  mobileNo: string;
  telNo: string;
  email: string;
  address: string;
  area: string;
  identityNo: string;
  trnNo: string;
  branchId: number;
  openingBalance: number;
  isActive: boolean;
}
