import { z } from "zod";

export const productionItemSchema = z.object({
  id: z.number().optional(),
  productId: z.number(),
  product: z.string().optional(),
  code: z.string().optional(),
  unitId: z.number(),
  unit: z.string().optional(),
  qty: z.number().min(0.001, "Qty must be greater than 0"),
  cost: z.number(),
  amount: z.number(),
});

export type ProductionLineItem = z.infer<typeof productionItemSchema>;

export const productionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  employeeId: z.string().min(1, "Employee is required"),
  productionNo: z.string().optional(),
  
  finishedProduct: z.string().min(1, "Finished Product is required"),
  finishedProductCode: z.string().optional(),
  finishedProductUnit: z.string().min(1, "Unit is required"),
  finishedProductUnitName: z.string().optional(),
  finishedProductQty: z.string().min(1, "Output Qty is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Invalid Qty"),
  
  // Temporary fields for adding items
  product: z.string().optional(),
  code: z.string().optional(),
  unit: z.string().optional(),
  qty: z.string().optional(),
  cost: z.string().optional(),
  
  otherCharge: z.string().optional(),
  narration: z.string().optional(),

  items: z.array(productionItemSchema).min(1, "At least one raw material is required"),
});

export type ProductionForm = z.infer<typeof productionSchema>;

export interface ProductionDetailParams {
  BranchId?: number;
  ProductId?: number;
  FromDate?: string;
  ToDate?: string;
}

export interface ProductionPayload {
  transId?: number;
  productionNo?: string | number;
  productionDate: string;
  productId: number;
  unitId: number;
  qty: number;
  cost: number;
  totalWage: number;
  amount: number;
  baseQty: number;
  branchId: number;
  employeeId: number;
  narration: string;
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
}
