import { z } from "zod";

export const paymentVoucherSchema = z.object({
  seriesId: z.number().min(1, "Series is required"),
  prefix: z.string().optional(),
  voucherDate: z.string().min(1, "Date is required"),
  voucherNo: z.string().min(1, "Voucher No is required"),
  accountId: z.number().min(1, "Account is required"),
  accountName: z.string().min(1, "Account name is required"),
  paymodeId: z.number().min(1, "Paymode is required"),
  branchId: z.number().min(1, "Branch is required"),
  employeeId: z.number().min(1, "Employee is required"),
  refNo: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine(val => Number(val) > 0, "Invalid amount"),
  narration: z.string().optional(),
  paymodes: z.array(z.object({
    paymodeId: z.number(),
    amount: z.number()
  })).optional(),
});

export type PaymentVoucherForm = z.infer<typeof paymentVoucherSchema>;

export interface PaymentVoucherPayload {
  transId?: number;
  seriesId: number;
  prefix: string;
  branchId: number;
  accountId: number;
  paymodeId: number;
  counterId: number;
  dayId: number;
  shiftId: number;
  employeeId: number;
  voucherDate: string;
  amount: number;
  refNo?: string;
  narration?: string;
  createdAt?: string;
  updatedAt?: string;
  paymodes: { paymodeId: number; amount: number }[];
}

export interface PaymentMasterData {
  series: { seriesId: number; seriesName: string; prefix: string; startNo: number; branchId: number; }[];
  branches: { branchId: number; branchName: string; }[];
  salesman: { employeeId: number; employeeName: string; }[];
  paymodes: { paymodeId: number; paymodeName: string; }[];
}

export interface PaymentAccount {
  accountId: number;
  code: string;
  accountName: string;
}

export interface PaymentListDto {
  transId: number;
  sNo: number;
  voucherDate: string;
  voucherNo: string;
  code: string;
  account: string;
  amount: string;
}

export interface PaymentDataResponse {
  masterData: {
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
    amount: number;
    createdAt?: string;
    modifiedAt?: string;
    isCancelled?: boolean;
  };
  paymodesData: any;
}
