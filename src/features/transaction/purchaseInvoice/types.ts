import { z } from "zod";

export const purchaseInvoiceItemSchema = z.object({
  id: z.string().optional(), // We'll use a string UUID for frontend generation, or number
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

export const purchaseInvoicePaymentSchema = z.object({
  mode: z.string(),
  amount: z.string(),
  paymodeId: z.number().optional(),
});

export const purchaseInvoiceSchema = z.object({
  series: z.string().min(1, "Series is required"),
  purchaseNo: z.string().min(1, "Purchase No is required"),
  purchaseDate: z.string().min(1, "Purchase Date is required"),
  invoiceNo: z.string().min(1, "Invoice No is required"),
  refNo: z.string().optional(),
  invoiceDate: z.string().min(1, "Invoice Date is required"),
  supplier: z.string().min(1, "Supplier is required"),
  branch: z.string().min(1, "Branch is required"),
  salesman: z.string().min(1, "Salesman is required"),
  
  items: z.array(purchaseInvoiceItemSchema),
  payments: z.array(purchaseInvoicePaymentSchema),
  
  globalDiscPercent: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  discAmount: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  narration: z.string().optional(),
  otherCharge: z.string().refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  roundOff: z.string().default("0"),
});

export type PurchaseInvoiceLineItem = z.infer<typeof purchaseInvoiceItemSchema>;
export type PurchasePaymentLine = z.infer<typeof purchaseInvoicePaymentSchema>;
export type PurchaseInvoiceForm = z.infer<typeof purchaseInvoiceSchema>;
