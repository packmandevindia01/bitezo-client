import { z } from "zod";

export const receiptAgainstDetailSchema = z.object({
  invoiceId: z.number(),
  voucherType: z.string(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  invoiceAmount: z.number().optional(),
  balance: z.number().optional(),
  amount: z.string().refine(val => Number(val) !== 0, "Amount cannot be zero"),
});

export const receiptAgainstVoucherSchema = z.object({
  transId: z.number().optional(),
  seriesId: z.coerce.number({ invalid_type_error: "Series is required" }).min(1, "Series is required"),
  prefix: z.string().optional().default(""),
  vchNo: z.string().optional(), // For UI display purposes
  branchId: z.coerce.number({ invalid_type_error: "Branch is required" }),
  accountId: z.coerce.number({ invalid_type_error: "Account/Customer is required" }).min(1, "Account/Customer is required"),
  paymodeId: z.coerce.number({ invalid_type_error: "Paymode is required" }).min(1, "Paymode is required"),
  employeeId: z.coerce.number({ invalid_type_error: "Salesman is required" }).min(1, "Salesman is required"),
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
