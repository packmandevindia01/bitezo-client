import { z } from "zod";

export const supplierSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code cannot exceed 20 characters").trim().toUpperCase(),
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters").trim(),
  arabicName: z.string().max(100, "Arabic Name cannot exceed 100 characters"),
  mobileNo: z.string().max(20, "Mobile No cannot exceed 20 characters"),
  telNo: z.string().max(20, "Tel No cannot exceed 20 characters"),
  email: z.string().max(100, "Email cannot exceed 100 characters"),
  address: z.string().max(500, "Address cannot exceed 500 characters"),
  area: z.string().max(100, "Area cannot exceed 100 characters"),
  identityNo: z.string().max(50, "Identity No cannot exceed 50 characters"),
  trnNo: z.string().max(50, "TRN No cannot exceed 50 characters"),
  branchId: z.number().min(1, "Branch is required"),
  openingBalance: z.union([z.string(), z.number()]).refine(val => {
    const strVal = String(val);
    return /^-?\d+(\.\d{1,10})?$/.test(strVal) && strVal.length <= 15;
  }, "Invalid amount (max 15 characters)"),
  isActive: z.boolean(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
