import { z } from "zod";

export const customerSchema = z.object({
  id: z.number().optional(),
  customerCode: z.string().min(1, "Customer code is required").max(20, "Code cannot exceed 20 characters").trim(),
  customerName: z.string().min(1, "Customer name is required").max(100, "Name cannot exceed 100 characters").trim(),
  arabicName: z.string().max(100, "Arabic name cannot exceed 100 characters").optional().default(""),
  mobileNo: z.string().min(1, "Mobile number is required").max(20, "Mobile number cannot exceed 20 characters").trim(),
  telNo: z.string().max(20, "Tel number cannot exceed 20 characters").optional().default(""),
  email: z.string().max(30, "Email cannot exceed 30 characters").optional().default(""),
  address: z.string().max(250, "Address cannot exceed 250 characters").optional().default(""),
  area: z.string().max(100, "Area cannot exceed 100 characters").optional().default(""),
  identityNo: z.string().max(50, "Identity No cannot exceed 50 characters").optional().default(""),
  trnNo: z.string().max(50, "TRN No cannot exceed 50 characters").optional().default(""),
  branch: z.string().min(1, "Branch is required").max(50).trim(),
  openingBalance: z.union([z.string(), z.number()]).refine(val => {
    const strVal = String(val).trim();
    if (!strVal) return false;
    return /^-?\d+(\.\d{1,10})?$/.test(strVal) && strVal.length <= 15;
  }, "Opening balance is required (max 15 characters)"),
  isActive: z.boolean().optional().default(true),
});

export type CustomerForm = z.infer<typeof customerSchema>;
