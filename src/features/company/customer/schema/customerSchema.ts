import { z } from "zod";

export const customerSchema = z.object({
  id: z.number().optional(),
  customerCode: z.string().min(1, "Customer code is required").trim(),
  customerName: z.string().min(1, "Customer name is required").trim(),
  arabicName: z.string().optional().default(""),
  mobileNo: z.string().min(1, "Mobile number is required").trim(),
  telNo: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  area: z.string().optional().default(""),
  flatNo: z.string().optional().default(""),
  buildingNo: z.string().optional().default(""),
  blockNo: z.string().optional().default(""),
  roadNo: z.string().optional().default(""),
  identityNo: z.string().optional().default(""),
  trnNo: z.string().optional().default(""),
  branch: z.string().optional().default(""),
  openingBalance: z.union([z.string(), z.number()]).optional().default("0.000"),
  isActive: z.boolean().optional().default(true),
});

export type CustomerForm = z.infer<typeof customerSchema>;
