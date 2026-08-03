import { z } from "zod";

export const companyFormSchema = z.object({
  regId: z.string().min(1, "Registration ID is required").max(50, "max 50 chars"),
  custName: z.string().min(1, "Company Name is required").max(100, "max 100 chars"),
  crNo: z.string().min(1, "CR Number is required").max(20, "max 20 chars"),
  country: z.string().min(1, "Country is required").max(50, "max 50 chars"),
  custMob: z.string().min(1, "Mobile number is required").max(20, "max 20 chars"),
  email: z.string().email("Invalid email").max(100, "max 100 chars").optional().or(z.literal("")),
  custMob2: z.string().max(20, "max 20 chars").optional(),
  taxRegNo: z.string().max(20, "max 20 chars").optional(),
  currency: z.string().min(1, "Primary Currency is required").max(50, "max 50 chars"),
  block: z.string().max(15, "max 15 chars").optional(),
  area: z.string().max(50, "max 50 chars").optional(),
  building: z.string().max(20, "max 20 chars").optional(),
  road: z.string().max(20, "max 20 chars").optional(),
  flatNo: z.string().max(20, "max 20 chars"),
  customerId: z.string().max(50, "max 50 chars"),
  branchCount: z.number(),
  startDate: z.string(),
  isDemo: z.boolean(),
  database: z.string().max(100, "max 100 chars"),
}).superRefine((data, ctx) => {
  if (!data.custMob || !data.custMob.trim()) return;
  const digits = data.custMob.replace(/\D/g, "").length;
  if (digits === 0) return;

  if (data.country === "7" || data.country === "India") {
    if (digits < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custMob"],
        message: "must be 10 digits",
      });
    }
  } else if (data.country === "3" || data.country === "4") {
    if (digits < 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custMob"],
        message: "min 9 digits",
      });
    }
  } else {
    if (digits < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custMob"],
        message: "min 8 digits",
      });
    }
  }
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
