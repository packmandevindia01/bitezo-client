import { z } from "zod";

export const productionItemSchema = z.object({
  id: z.string().optional(), // uuid
  productId: z.number().optional(),
  product: z.string().min(1, "Product is required"),
  productName: z.string().optional(),
  code: z.string().optional(),
  unitId: z.number().optional(),
  unit: z.string().optional(),
  unitCategory: z.string().optional(),
  stock: z.string().optional(),
  avgCost: z.union([z.string(), z.number()]).optional(),
  qty: z.string().min(1, "Qty required"),
  cost: z.string().min(1, "Cost required"),
  amount: z.number().optional(),
});

export type ProductionLineItem = z.infer<typeof productionItemSchema>;

export const productionSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  employeeId: z.string().min(1, "Employee is required"),
  productionNo: z.string().optional(),
  
  finishedProduct: z.string().min(1, "Finished Product is required"),
  finishedProductCode: z.string().optional(),
  finishedProductName: z.string().optional(),
  finishedProductUnit: z.string().min(1, "Unit is required"),
  finishedProductUnitName: z.string().optional(),
  finishedProductQty: z.string().min(1, "Output Qty is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Invalid Qty"),
  
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
