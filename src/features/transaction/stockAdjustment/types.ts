import { z } from "zod";

export const stockAdjustmentItemSchema = z.object({
  id: z.string().optional(),
  product: z.string().min(1, "Product is required"),
  code: z.string().optional(),
  unit: z.string().optional(),
  unitId: z.number().optional(),
  qty: z.string().refine(val => Number(val) > 0, "Qty > 0").default("1"),
  cost: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  type: z.string().min(1, "Type is required"),
  typeId: z.number().optional(),
  typeName: z.string().optional(),
  effect: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  series: z.string().min(1, "Series is required"),
  refNo: z.string().min(1, "Ref No is required"),
  date: z.string().min(1, "Date is required"),
  branch: z.string().min(1, "Branch is required"),
  salesman: z.string().optional(),
  items: z.array(stockAdjustmentItemSchema),
});

export type StockAdjustmentLineItem = z.infer<typeof stockAdjustmentItemSchema>;
export type StockAdjustmentForm = z.infer<typeof stockAdjustmentSchema>;


export interface StockAdjustmentPayloadDetail {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  amount: number;
  baseQty: number;
  typeId: number;
  effect: string;
}

export interface StockAdjustmentPayload {
  transDate: string;
  branchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  createdAt: string;
  details: StockAdjustmentPayloadDetail[];
}

export interface StockAdjustmentDetailParams {
  BranchId?: number;
  FromDate?: string;
  ToDate?: string;
  RefNo?: string;
  Decimals?: number;
}
