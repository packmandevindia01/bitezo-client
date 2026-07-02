import { z } from "zod";

export const supplierSchema = z.object({
  code: z.string().min(1, "Code is required").trim().toUpperCase(),
  name: z.string().min(1, "Name is required").trim(),
  arabicName: z.string(),
  mobileNo: z.string(),
  telNo: z.string(),
  email: z.string(),
  address: z.string(),
  area: z.string(),
  identityNo: z.string(),
  trnNo: z.string(),
  branchId: z.number().min(1, "Branch is required"),
  openingBalance: z.union([z.string(), z.number()]),
  isActive: z.boolean(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
