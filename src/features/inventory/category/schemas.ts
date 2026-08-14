import { z } from "zod";

export const categoryFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Name is required").max(50, "Maximum 50 characters allowed"),
  arabic: z.string().optional(),
  isActive: z.boolean().default(true),
  posStatus: z.boolean().default(true),
  colorCode: z.string().default("red"),
  branchAllocations: z.array(
    z.object({
      branchId: z.number(),
      colorCode: z.string()
    })
  ).default([]),
  menuIds: z.array(z.number()).default([]),
  imageFile: z.any().optional(), // File | undefined
  image: z.string().optional(),
});

export type CategoryForm = z.infer<typeof categoryFormSchema>;
