import { z } from "zod";

export const physicalEntryItemSchema = z.object({
  id: z.string().optional(),
  product: z.string().min(1, "Product is required"),
  productName: z.string().optional(),
  code: z.string().optional(),
  unit: z.string().optional(),
  unitId: z.number().optional(),
  unitCategory: z.string().optional(),
  stock: z.string().optional(),
  qty: z.string().refine(val => Number(val) > 0, "Qty > 0").default("1"),
  cost: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
});

export const physicalEntrySchema = z.object({
  refNo: z.string().min(1, "Ref No is required"),
  date: z.string().min(1, "Date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, { message: "Future dates are not allowed" }),
  branch: z.string().min(1, "Branch is required"),
  salesman: z.string().min(1, "Salesman is required"),
  narration: z.string().max(200, "Max 200 characters").optional(),
  items: z.array(physicalEntryItemSchema),
});

export type PhysicalEntryLineItem = z.infer<typeof physicalEntryItemSchema>;
export type PhysicalEntryForm = z.infer<typeof physicalEntrySchema>;

export interface PhysicalEntryPayloadDetail {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  amount: number;
  baseQty: number;
}

export interface PhysicalEntryPayload {
  transId?: number;
  transDate: string;
  branchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  createdAt: string;
  details: PhysicalEntryPayloadDetail[];
}

export interface PhysicalEntryDetailParams {
  BranchId?: number;
  FromDate?: string;
  ToDate?: string;
  RefNo?: string;
  Decimals?: number;
}
