import { z } from "zod";

export const recipeItemSchema = z.object({
  id: z.number().optional(),
  productId: z.number(),
  product: z.string().optional(),
  code: z.string().optional(),
  unitId: z.number(),
  unit: z.string().optional(),
  qty: z.number().min(0.001, "Qty must be greater than 0"),
  cost: z.number(),
  amount: z.number(),
  excludeOrders: z.array(z.number()).optional(),
});

export type RecipeLineItem = z.infer<typeof recipeItemSchema>;

export const recipeSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  finishedProduct: z.string().min(1, "Finished Product is required"),
  finishedProductCode: z.string().optional(),
  finishedProductUnit: z.string().min(1, "Unit is required"),
  finishedProductUnitName: z.string().optional(),
  finishedProductQty: z.string().min(1, "Output Qty is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Invalid Qty"),
  
  // Temporary fields for adding items
  rawMaterial: z.string().optional(),
  code: z.string().optional(),
  unit: z.string().optional(),
  unitName: z.string().optional(),
  qty: z.string().optional(),
  cost: z.string().optional(),
  amount: z.string().optional(),
  
  items: z.array(recipeItemSchema).min(1, "At least one raw material is required"),
  excludeOrders: z.array(z.number()).optional(),
});

export type RecipeForm = z.infer<typeof recipeSchema>;

export interface RecipePayload {
  transId?: number;
  productId: number;
  unitId: number;
  qty: number;
  cost: number;
  amount: number;
  baseQty: number;
  branchId: number;
  createdAt?: string;
  updateAt?: string;
  details: {
    productId: number;
    unitId: number;
    qty: number;
    cost: number;
    amount: number;
    baseQty: number;
  }[];
  excludeOrders?: {
    orderTypeId: number;
    productId: number;
    unitId: number;
  }[];
}
