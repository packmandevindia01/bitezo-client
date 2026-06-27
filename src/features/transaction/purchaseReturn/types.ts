import { z } from "zod";

export const purchaseReturnItemSchema = z.object({
  id: z.string().optional(),
  product: z.string().min(1, "Product is required"),
  code: z.string().optional(),
  unit: z.string().optional(),
  qty: z.string().refine(val => Number(val) > 0, "Qty > 0").default("1"),
  foc: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  price: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  vatId: z.string().default("0"),
  vatPercent: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  discPercent: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
});

export const purchaseReturnPaymentSchema = z.object({
  mode: z.string(),
  amount: z.string(),
  paymodeId: z.number().optional(),
});

export const purchaseReturnSchema = z.object({
  series: z.string().min(1, "Series is required"),
  purchaseNo: z.string().min(1, "Purchase No is required"),
  purchaseDate: z.string().min(1, "Purchase Date is required"),
  invoiceNo: z.string().min(1, "Invoice No is required"),
  refNo: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice Date is required"),
  supplier: z.string().min(1, "Supplier is required"),
  branch: z.string().min(1, "Branch is required"),
  salesman: z.string().optional(),
  
  items: z.array(purchaseReturnItemSchema),
  payments: z.array(purchaseReturnPaymentSchema),
  
  globalDiscPercent: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  discAmount: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  narration: z.string().optional(),
  otherCharge: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  roundOff: z.string().default("0"),
});

export type PurchaseReturnLineItem = z.infer<typeof purchaseReturnItemSchema>;
export type PurchasePaymentLine = z.infer<typeof purchaseReturnPaymentSchema>;
export type PurchaseReturnForm = z.infer<typeof purchaseReturnSchema>;
