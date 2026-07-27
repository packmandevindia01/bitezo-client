export interface ReceiptAgainstSeries {
  seriesId: number;
  seriesName: string;
  prefix: string;
  startNo: number;
  branchId: number;
}

export interface ReceiptAgainstBranch {
  branchId: number;
  branchName: string;
}

export interface ReceiptAgainstSalesman {
  employeeId: number;
  employeeName: string;
}

export interface ReceiptAgainstPaymode {
  paymodeId: number;
  paymodeName: string;
}

export interface ReceiptAgainstMasterDataResponse {
  series: ReceiptAgainstSeries[];
  branches: ReceiptAgainstBranch[];
  salesman: ReceiptAgainstSalesman[];
  paymodes: ReceiptAgainstPaymode[];
}

export interface ReceiptAgainstAccount {
  accountId: number;
  code: string;
  accountName: string;
}

export interface ReceiptAgainstPendingInvoice {
  invoiceId: number;
  voucherType: string;
  invoiceDate: string;
  invoiceNo: string;
  invoiceAmount: string;
  balance: string;
}

export interface ReceiptAgainstDetailPayload {
  invoiceId: number;
  voucherType: string;
  amount: number;
}

export interface ReceiptAgainstPaymodePayload {
  paymodeId: number;
  amount: number;
}

export interface ReceiptAgainstPayload {
  transId?: number;
  seriesId: number;
  prefix: string;
  branchId: number;
  accountId: number;
  paymodeId: number;
  dayId: number;
  shiftId: number;
  employeeId: number;
  voucherDate: string;
  discount: number;
  amount: number;
  refNo: string;
  narration: string;
  createdAt?: string;
  updatedAt?: string;
  details: ReceiptAgainstDetailPayload[];
  paymodes?: ReceiptAgainstPaymodePayload[];
}

export interface ReceiptAgainstListItem {
  transId: number;
  sNo: number;
  voucherDate: string;
  voucherNo: string;
  code: string;
  account: string;
  amount: string;
}

export interface ReceiptAgainstDetailData {
  sNo: number;
  voucherType: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  receivedAmount: number;
  invoiceId: number;
}

export interface ReceiptAgainstMasterData {
  seriesId: number;
  voucherNo: string;
  branchId: number;
  accountId: number;
  paymodeId: number;
  employeeId: number;
  voucherDate: string;
  discount: number;
  amount: number;
  refNo: string;
  narration: string;
}

export interface ReceiptAgainstDataResponse {
  masterData: ReceiptAgainstMasterData;
  detailsData: ReceiptAgainstDetailData[] | null;
  paymodesData: ReceiptAgainstPaymodePayload[] | null;
}
