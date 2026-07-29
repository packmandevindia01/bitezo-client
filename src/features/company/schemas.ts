import { z } from "zod";

export const companyFormSchema = z.object({
  regId: z.string().min(1, "Registration ID is required"),
  custName: z.string().min(1, "Company Name is required"),
  crNo: z.string().min(1, "CR Number is required"),
  country: z.string().min(1, "Country is required"),
  custMob: z.string().min(8, "Mobile number must be at least 8 digits"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  custMob2: z.string().optional(),
  taxRegNo: z.string().optional(),
  currency: z.string().min(1, "Primary Currency is required"),
  block: z.string().optional(),
  area: z.string().optional(),
  building: z.string().optional(),
  road: z.string().optional(),
  flatNo: z.string(),
  customerId: z.string(),
  branchCount: z.number(),
  startDate: z.string(),
  isDemo: z.boolean(),
  database: z.string(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
