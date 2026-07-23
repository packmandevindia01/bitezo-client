import { z } from "zod";

export const getPurchaseReturnItemSchema = (decimalPart: number) => {
  const posAmountRegex = new RegExp(`^\\d{0,10}(\\.\\d{0,${decimalPart}})?$`);
  return z.object({
    id: z.string().optional(),
    product: z.string().min(1, "Product is required"),
    code: z.string().optional(),
    unit: z.string().optional(),
    unitCategory: z.string().optional(),
    stock: z.string().default("..."),
    avgCost: z.union([z.string(), z.number()]).default("..."),
    qty: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) > 0, "Qty > 0").default("1"),
    foc: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    price: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    vatId: z.string().default("0"),
    vatPercent: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    discPercent: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  });
};

export const getPurchaseReturnPaymentSchema = (decimalPart: number) => {
  const posAmountRegex = new RegExp(`^\\d{0,10}(\\.\\d{0,${decimalPart}})?$`);
  return z.object({
    mode: z.string(),
    amount: z.string().regex(posAmountRegex, "Invalid amount"),
    paymodeId: z.number().optional(),
  });
};

export const getPurchaseReturnSchema = (decimalPart: number) => {
  const posAmountRegex = new RegExp(`^\\d{0,10}(\\.\\d{0,${decimalPart}})?$`);

  return z.object({
    series: z.string().min(1, "Series is required"),
    purchaseNo: z.string().min(1, "Purchase No is required"),
    purchaseDate: z.string().min(1, "Purchase Date is required"),
    invoiceNo: z.string()
      .min(1, "Invoice No is required")
      .max(50, "Max 50 characters")
      .regex(/^[a-zA-Z0-9\s\-_]+$/, "Special characters not allowed"),
    refNo: z.string()
      .max(50, "Max 50 characters")
      .regex(/^[a-zA-Z0-9\s\-_]*$/, "Special characters not allowed")
      .optional(),
    supplier: z.string().min(1, "Supplier is required"),
    branch: z.string().min(1, "Branch is required"),
    salesman: z.string().min(1, "Salesman is required"),
    
    items: z.array(getPurchaseReturnItemSchema(decimalPart)),
    payments: z.array(getPurchaseReturnPaymentSchema(decimalPart)),
    
    globalDiscPercent: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    discAmount: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    narration: z.string().max(200, "Max 200 characters").optional(),
    otherCharge: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    roundOff: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  });
};

export type PurchaseReturnLineItem = z.infer<ReturnType<typeof getPurchaseReturnItemSchema>>;
export type PurchasePaymentLine = z.infer<ReturnType<typeof getPurchaseReturnPaymentSchema>>;
export type PurchaseReturnForm = z.infer<ReturnType<typeof getPurchaseReturnSchema>>;
