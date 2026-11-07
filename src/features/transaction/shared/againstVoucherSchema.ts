import { z } from "zod";

const detailSchema = z.object({
  invoiceId: z.number(),
  voucherType: z.string(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceAmount: z.number().optional(),
  balance: z.number().optional(),
  amount: z.string().refine(val => Number(val) !== 0, "Amount cannot be zero"),
}).superRefine((data, ctx) => {
  if (data.balance !== undefined && Number(data.amount) > data.balance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Amount cannot exceed balance`,
      path: ["amount"]
    });
  }
});

/** The form of a Payment or Receipt Against Voucher; only two messages differ. */
export const createAgainstVoucherSchema = (party: string, action: string) => z.object({
  transId: z.number().optional(),
  seriesId: z.coerce.number().min(1, "Series is required"),
  prefix: z.string().optional().default(""),
  vchNo: z.string().optional(), // For UI display purposes
  branchId: z.coerce.number().min(1, "Branch is required"),
  accountId: z.coerce.number().min(1, `Account/${party} is required`),
  paymodeId: z.coerce.number().min(1, "Paymode is required"),
  employeeId: z.coerce.number().min(1, "Employee is required"),
  voucherDate: z.string().min(1, "Voucher Date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, { message: "Future dates are not allowed" }),
  discount: z.number().min(0).default(0),
  refNo: z.string().optional().default(""),
  narration: z.string().max(200, "Narration cannot exceed 200 characters").optional().default(""),
  details: z.array(detailSchema).min(1, `Select at least one invoice to ${action} against`),
  paymodes: z.array(z.object({
    paymodeId: z.number(),
    amount: z.number()
  })).optional().default([]),
});

export type AgainstVoucherFormData = z.infer<ReturnType<typeof createAgainstVoucherSchema>>;
