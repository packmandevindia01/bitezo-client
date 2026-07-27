import { z } from "zod";

export const altProductSchema = z.object({
  unitId: z.string().min(1, "Unit is required"),
  barcode: z.string().min(1, "Barcode is required").max(100, "Barcode must be 100 characters or less"),
  isIncl: z.boolean(),
  price: z.string().min(1, "Price is required").max(15, "Max 15 characters allowed").refine(val => Number(val) >= 0, "Price must be 0 or greater"),
  altName: z.string().min(1, "Alternative name is required").max(500, "Alternative name must be 500 characters or less"),
  altArabic: z.string().max(500, "Alternative Arabic name must be 500 characters or less"),
  branchId: z.string().min(1, "Branch is required")
});

export const productColorSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  colorCode: z.string().min(1, "Color is required")
});

export const productSchema = z.object({
  productId: z.number().optional(),
  code: z.string().min(1, "Code is required").max(100, "Code must be 100 characters or less"),
  name: z.string().min(1, "Product name is required").max(500, "Product name must be 500 characters or less"),
  arabicName: z.string().max(500, "Arabic name must be 500 characters or less"),
  categoryId: z.string().min(1, "Category is required"),
  subCatId: z.string().optional().or(z.literal("")),
  branchId: z.string().min(1, "Branch is required"),
  groupId: z.string().min(1, "Group is required"),
  typeId: z.string().min(1, "Type is required"),
  unitId: z.string().min(1, "Unit is required"),
  pVatId: z.string().min(1, "Purchase VAT is required"),
  sVatId: z.string().min(1, "Sales VAT is required"),
  cost: z.string().min(1, "Cost is required").max(15, "Max 15 characters allowed").refine(val => Number(val) >= 0, "Cost must be 0 or greater"),
  price: z.string().min(1, "Price is required").max(15, "Max 15 characters allowed").refine(val => Number(val) >= 0, "Price must be 0 or greater"),
  barcode: z.string().min(1, "Barcode is required").max(100, "Barcode must be 100 characters or less"),
  colorCode: z.string(),
  isActive: z.boolean(),
  priceIsIncl: z.boolean(),
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  filePath: z.string().optional(),
  altProducts: z.array(altProductSchema),
  productColors: z.array(productColorSchema)
});

export type ProductFormData = z.infer<typeof productSchema>;
export type AltProductFormData = z.infer<typeof altProductSchema>;
export type ProductColorFormData = z.infer<typeof productColorSchema>;
export type AltProductDraft = AltProductFormData & { id?: number | string };
