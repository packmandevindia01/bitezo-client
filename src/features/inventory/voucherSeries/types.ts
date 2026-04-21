export interface VoucherSeriesRecord {
  voucherId: number;
  sNo: number;
  voucherType: string;
  voucherName: string;
  branch: string;
}

export interface VoucherSeriesDetail {
  voucherId: number;
  voucherType: string;
  voucherName: string;
  prefix: string;
  startNo: number;
  branchId: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherSeriesForm {
  voucherType: string;
  name: string;
  prefix: string;
  startNo: string;
  branchId: string;
}

export interface VoucherSeriesPayload {
  voucherId?: number;
  voucherType: string;
  voucherName: string;
  prefix: string;
  startNo: number;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
}
