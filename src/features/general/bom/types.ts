import { z } from "zod";

export const bomItemSchema = z.object({
  id: z.string().optional(), // uuid
  productId: z.number().optional(),
  product: z.string().min(1, "Product is required"),
  productName: z.string().optional(), // stored label for display
  code: z.string().optional(),
  unitId: z.number().optional(),
  unit: z.string().optional(),
  unitCategory: z.string().optional(),
  qty: z.string().min(1, "Qty required").max(10, "Quantity too large").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Invalid Qty"),
});

export type BomLineItem = z.infer<typeof bomItemSchema>;

export const bomSchema = z.object({
  bomName: z.string().min(1, "BOM Name is required").max(100, "BOM Name cannot exceed 100 characters"),
  branchId: z.string().min(1, "Branch is required"),
  finishedProduct: z.string().min(1, "Finished Product is required"),
  finishedProductCode: z.string().optional(),
  finishedProductUnit: z.string().min(1, "Unit is required"),
  finishedProductUnitName: z.string().optional(),
  finishedProductQty: z.string().min(1, "Output Qty is required").max(10, "Quantity too large").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Invalid Qty"),
  items: z.array(bomItemSchema).min(1, "At least one item is required"),
});

export type BomForm = z.infer<typeof bomSchema>;

export interface BomPayload {
  transId?: number;
  bomName: string;
  productId: number;
  unitId: number;
  qty: number;
  branchId: number;
  createdAt?: string;
  updatedAt?: string;
  details: {
    productId: number;
    unitId: number;
    qty: number;
    baseQty: number;
  }[];
}

export interface BomDetailParams {
  BranchId?: number;
  ProductId?: number;
  UnitId?: number;
}
