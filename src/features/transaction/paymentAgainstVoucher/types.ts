export interface PaymentAgainstSeries {
  seriesId: number;
  seriesName: string;
  prefix: string;
  startNo: number;
  branchId: number;
}

export interface PaymentAgainstBranch {
  branchId: number;
  branchName: string;
}

export interface PaymentAgainstSalesman {
  employeeId: number;
  employeeName: string;
}

export interface PaymentAgainstPaymode {
  paymodeId: number;
  paymodeName: string;
}

export interface PaymentAgainstMasterDataResponse {
  series: PaymentAgainstSeries[];
  branches: PaymentAgainstBranch[];
  salesman: PaymentAgainstSalesman[];
  paymodes: PaymentAgainstPaymode[];
}

export interface PaymentAgainstAccount {
  accountId: number;
  code: string;
  accountName: string;
}

export interface PaymentAgainstPendingInvoice {
  invoiceId: number;
  voucherType: string;
  invoiceDate: string;
  invoiceNo: string;
  invoiceAmount: string; // The API returns string, e.g. "-0.100"
  balance: string; // The API returns string, e.g. "-0.100"
}

export interface PaymentAgainstDetailPayload {
  invoiceId: number;
  voucherType: string;
  amount: number;
}

export interface PaymentAgainstPaymodePayload {
  paymodeId: number;
  amount: number;
}

export interface PaymentAgainstCreatePayload {
  seriesId: number;
  prefix: string;
  branchId: number;
  accountId: number;
  paymodeId: number;
  dayId: number;
  shiftId: number;
  employeeId: number;
  voucherDate: string; // YYYY-MM-DD
  discount: number;
  amount: number;
  refNo?: string;
  narration?: string;
  createdAt: string; // ISO
  details: PaymentAgainstDetailPayload[];
  paymodes: PaymentAgainstPaymodePayload[];
}

export interface PaymentAgainstUpdatePayload {
  transId: number;
  branchId: number;
  accountId: number;
  paymodeId: number;
  employeeId: number;
  voucherDate: string; // YYYY-MM-DD
  discount: number;
  amount: number;
  refNo?: string;
  narration?: string;
  updatedAt: string; // ISO
  details: PaymentAgainstDetailPayload[];
  paymodes: PaymentAgainstPaymodePayload[];
}

export type PaymentAgainstPayload = PaymentAgainstCreatePayload | PaymentAgainstUpdatePayload;

export interface PaymentAgainstListItem {
  transId: number;
  sNo: number;
  voucherDate: string;
  voucherNo: string;
  code: string;
  account: string;
  amount: string; // The API returns string e.g. "10.000"
}

export interface PaymentAgainstDetailData {
  sNo: number;
  voucherType: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  receivedAmount: number;
  invoiceId: number;
}

export interface PaymentAgainstMasterData {
  seriesId: number;
  voucherNo: string;
  voucherDate: string;
  branchId: number;
  employeeId: number;
  accountId: number;
  accountName: string;
  refNo: string;
  narration: string;
  paymodeId: number;
  discount: number;
  amount: number;
  createdAt: string;
  modifiedAt: string;
  isCancelled: boolean;
}

export interface PaymentAgainstDataResponse {
  masterData: PaymentAgainstMasterData;
  detailsData: PaymentAgainstDetailData[];
  paymodesData: any | null;
}
