export interface AgainstSeries {
  seriesId: number;
  seriesName: string;
  prefix: string;
  startNo: number;
  branchId: number;
}

export interface AgainstBranch {
  branchId: number;
  branchName: string;
}

export interface AgainstSalesman {
  employeeId: number;
  employeeName: string;
}

export interface AgainstPaymode {
  paymodeId: number;
  paymodeName: string;
}

export interface AgainstMasterDataResponse {
  series: AgainstSeries[];
  branches: AgainstBranch[];
  salesman: AgainstSalesman[];
  paymodes: AgainstPaymode[];
}

export interface AgainstAccount {
  accountId: number;
  code: string;
  accountName: string;
}

export interface AgainstPendingInvoice {
  invoiceId: number;
  voucherType: string;
  invoiceDate: string;
  invoiceNo: string;
  invoiceAmount: string;
  balance: string;
  InvoiceId?: number;
  id?: number;
  Id?: number;
  InvoiceNo?: string;
  vchNo?: string;
  VchNo?: string;
  voucherNo?: string;
  VoucherNo?: string;
  invNo?: string;
  InvNo?: string;
  VoucherType?: string;
  vchType?: string;
  VchType?: string;
  InvoiceDate?: string;
  InvoiceAmount?: string | number;
  invAmnt?: string | number;
  Balance?: string | number;
  paid?: string | number;
}

export interface AgainstDetailPayload {
  invoiceId: number;
  voucherType: string;
  amount: number;
}

export interface AgainstPaymodePayload {
  paymodeId: number;
  amount: number;
}

export interface AgainstCreatePayload {
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
  refNo: string;
  narration: string;
  createdAt: string; // ISO string
  details: AgainstDetailPayload[];
  paymodes: AgainstPaymodePayload[];
}

export interface AgainstUpdatePayload {
  transId: number;
  branchId: number;
  accountId: number;
  paymodeId: number;
  employeeId: number;
  voucherDate: string; // YYYY-MM-DD
  discount: number;
  amount: number;
  refNo: string;
  narration: string;
  updatedAt: string; // ISO string
  details: AgainstDetailPayload[];
  paymodes: AgainstPaymodePayload[];
}

export type AgainstPayload = AgainstCreatePayload | AgainstUpdatePayload;

export interface AgainstListItem {
  transId: number;
  sNo: number;
  voucherDate: string;
  voucherNo: string;
  code: string;
  account: string;
  amount: string;
  invoiceNo?: string;
  InvoiceNo?: string;
  invNo?: string;
  invoices?: string;
  vchNo?: string;
}

export interface AgainstDetailData {
  sNo: number;
  voucherType: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  receivedAmount: number;
  invoiceId: number;
}

export interface AgainstMasterData {
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

export interface AgainstDataResponse {
  masterData: AgainstMasterData;
  detailsData: AgainstDetailData[] | null;
  paymodesData: AgainstPaymodePayload[] | null;
}
