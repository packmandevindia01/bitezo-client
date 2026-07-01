import { z } from "zod";

export const altProductSchema = z.object({
  unitId: z.string().min(1, "Unit is required"),
  barcode: z.string().min(1, "Barcode is required"),
  isIncl: z.boolean(),
  price: z.string().min(1, "Price is required").refine(val => Number(val) > 0, "Price must be greater than 0"),
  altName: z.string().min(1, "Alternative name is required"),
  altArabic: z.string(),
  branchId: z.string().optional()
});

export const productColorSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  colorCode: z.string().min(1, "Color is required")
});

export const productSchema = z.object({
  productId: z.number().optional(),
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Product name is required"),
  arabicName: z.string(),
  categoryId: z.string().min(1, "Category is required"),
  subCatId: z.string().min(1, "Sub-category is required"),
  groupId: z.string().min(1, "Group is required"),
  typeId: z.string().min(1, "Type is required"),
  unitId: z.string().min(1, "Unit is required"),
  pVatId: z.string().min(1, "Purchase VAT is required"),
  sVatId: z.string().min(1, "Sales VAT is required"),
  cost: z.string().min(1, "Cost is required").refine(val => Number(val) >= 0, "Invalid cost"),
  price: z.string().min(1, "Price is required").refine(val => Number(val) > 0, "Price must be greater than 0"),
  barcode: z.string().min(1, "Barcode is required"),
  colorCode: z.string(),
  isActive: z.boolean(),
  priceIsIncl: z.boolean(),
  fileName: z.string().optional(),
  filePath: z.string().optional(),
  altProducts: z.array(altProductSchema),
  productColors: z.array(productColorSchema)
});

export type ProductFormData = z.infer<typeof productSchema>;
export type AltProductFormData = z.infer<typeof altProductSchema>;
export type ProductColorFormData = z.infer<typeof productColorSchema>;
export type AltProductDraft = AltProductFormData & { id?: number | string };
