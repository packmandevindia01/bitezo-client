import { z } from "zod";

export const subCategoryFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Maximum 50 characters allowed"),
  name: z.string().min(1, "Name is required").max(50, "Maximum 50 characters allowed"),
  arabicName: z.string().optional(),
  categoryId: z.union([z.number(), z.string()]).refine((val) => val !== "", {
    message: "Category is required",
  }),
  isActive: z.boolean(),
  imageFile: z.any().optional(), // File | undefined
  image: z.string().optional(),
});

export type SubCategoryForm = z.infer<typeof subCategoryFormSchema>;

