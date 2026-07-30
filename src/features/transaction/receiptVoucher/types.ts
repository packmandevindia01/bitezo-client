import { z } from "zod";

export const receiptVoucherSchema = z.object({
  seriesId: z.number().min(1, "Series is required"),
  prefix: z.string().optional(),
  voucherDate: z.string().min(1, "Date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, { message: "Future dates are not allowed" }),
  voucherNo: z.string().min(1, "Voucher No is required"),
  accountId: z.number().min(1, "Account is required"),
  accountName: z.string().min(1, "Account name is required"),
  paymodeId: z.number().min(1, "Paymode is required"),
  branchId: z.number().min(1, "Branch is required"),
  employeeId: z.number().min(1, "Employee is required"),
  refNo: z.string().max(50, "Reference No cannot exceed 50 characters").optional(),
  amount: z.string()
    .min(1, "Amount is required")
    .max(12, "Amount cannot exceed 12 characters")
    .refine(val => {
      if (!val || val.trim() === "") return true;
      return Number(val) > 0;
    }, "Amount must be greater than 0"),
  narration: z.string().max(200, "Narration cannot exceed 200 characters").optional(),
  paymodes: z.array(z.object({
    paymodeId: z.number(),
    amount: z.number()
  })).optional(),
}).superRefine((data, ctx) => {
  if (data.paymodeId === 3) {
    const totalMultiPay = (data.paymodes || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const voucherAmount = Number(data.amount) || 0;
    
    // allow a tiny float epsilon difference just in case
    if (Math.abs(totalMultiPay - voucherAmount) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total Multi-pay amount must match the voucher amount",
        path: ["amount"],
      });
    }
  }
});

export type ReceiptVoucherForm = z.infer<typeof receiptVoucherSchema>;

export interface ReceiptVoucherPayload {
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
  paymodes?: { paymodeId: number; amount: number }[];
}

export interface ReceiptMasterData {
  series: { seriesId: number; seriesName: string; prefix: string; startNo: number; branchId: number; }[];
  branches: { branchId: number; branchName: string; }[];
  salesman: { employeeId: number; employeeName: string; }[];
  paymodes: { paymodeId: number; paymodeName: string; }[];
}

export interface ReceiptAccount {
  accountId: number;
  code: string;
  accountName: string;
}

export interface ReceiptListDto {
  transId: number;
  sNo: number;
  voucherDate: string;
  voucherNo: string;
  code: string;
  account: string;
  amount: string;
}

export interface ReceiptDataResponse {
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
