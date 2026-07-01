import { z } from "zod";

export const supplierSchema = z.object({
  code: z.string().min(1, "Code is required").trim().toUpperCase(),
  name: z.string().min(1, "Name is required").trim(),
  arabicName: z.string().optional().nullable(),
  mobileNo: z.string().optional().nullable(),
  telNo: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").or(z.literal("")).optional().nullable(),
  address: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  identityNo: z.string().optional().nullable(),
  trnNo: z.string().optional().nullable(),
  branchId: z.number().min(1, "Branch is required"),
  openingBalance: z.union([z.string(), z.number()]).optional().default(0),
  isActive: z.boolean().default(true),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
