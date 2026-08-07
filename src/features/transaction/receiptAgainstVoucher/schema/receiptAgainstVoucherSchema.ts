import { z } from "zod";

export const receiptAgainstDetailSchema = z.object({
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

export const receiptAgainstVoucherSchema = z.object({
  transId: z.number().optional(),
  seriesId: z.coerce.number().min(1, "Series is required"),
  prefix: z.string().optional().default(""),
  vchNo: z.string().optional(), // For UI display purposes
  branchId: z.coerce.number(),
  accountId: z.coerce.number().min(1, "Account/Customer is required"),
  paymodeId: z.coerce.number().min(1, "Paymode is required"),
  employeeId: z.coerce.number().default(0),
  voucherDate: z.string().min(1, "Voucher Date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, { message: "Future dates are not allowed" }),
  discount: z.number().min(0).default(0),
  refNo: z.string().optional().default(""),
  narration: z.string().max(200, "Narration cannot exceed 200 characters").optional().default(""),
  details: z.array(receiptAgainstDetailSchema).min(1, "Select at least one invoice to receive against"),
  paymodes: z.array(z.object({
    paymodeId: z.number(),
    amount: z.number()
  })).optional().default([]),
});

export type ReceiptAgainstVoucherFormData = z.infer<typeof receiptAgainstVoucherSchema>;
