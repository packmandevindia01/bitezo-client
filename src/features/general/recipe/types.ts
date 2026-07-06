import { z } from "zod";

export const recipeItemSchema = z.object({
  id: z.string().optional(), // uuid
  productId: z.number().optional(),
  product: z.string().min(1, "Product is required"),
  productName: z.string().optional(), // stored label for display
  code: z.string().optional(),
  unitId: z.number().optional(),
  unit: z.string().optional(),
  unitCategory: z.string().optional(),
  qty: z.string().min(1, "Qty required"),
  cost: z.string().min(1, "Cost required"),
  amount: z.number().optional(),
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
