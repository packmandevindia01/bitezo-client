import { z } from "zod";

export const getPurchaseInvoiceItemSchema = (decimalPart: number) => {
  const posAmountRegex = new RegExp(`^\\d{0,10}(\\.\\d{0,${decimalPart}})?$`);
  return z.object({
    id: z.string().optional(), // We'll use a string UUID for frontend generation, or number
    product: z.string().min(1, "Product is required"),
    code: z.string().optional(),
    unit: z.string().optional(),
    unitCategory: z.string().optional(),
    stock: z.string().optional(),
    avgCost: z.union([z.string(), z.number()]).optional(),
    qty: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) > 0, "Qty > 0").default("1"),
    foc: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    price: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    vatId: z.string().default("0"),
    vatPercent: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    discPercent: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  });
};

export const getPurchaseInvoicePaymentSchema = (decimalPart: number) => {
  const posAmountRegex = new RegExp(`^\\d{0,10}(\\.\\d{0,${decimalPart}})?$`);
  return z.object({
    mode: z.string(),
    amount: z.string().regex(posAmountRegex, "Invalid amount"),
    paymodeId: z.number().optional(),
  });
};

export const getPurchaseInvoiceSchema = (decimalPart: number) => {
  const posAmountRegex = new RegExp(`^\\d{0,10}(\\.\\d{0,${decimalPart}})?$`);

  return z.object({
    series: z.string().min(1, "Series is required"),
    purchaseNo: z.string().min(1, "Purchase No is required"),
    purchaseDate: z.string().min(1, "Purchase Date is required").refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return selectedDate <= today;
    }, { message: "Future dates are not allowed" }),
    invoiceNo: z.string()
      .min(1, "Invoice No is required")
      .max(50, "Max 50 characters")
      .regex(/^[a-zA-Z0-9\s\-_]+$/, "Special characters not allowed"),
    refNo: z.string()
      .max(50, "Max 50 characters")
      .regex(/^[a-zA-Z0-9\s\-_]*$/, "Special characters not allowed")
      .optional(),
    invoiceDate: z.string().min(1, "Invoice Date is required").refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return selectedDate <= today;
    }, { message: "Future dates are not allowed" }),
    supplier: z.string().min(1, "Supplier is required"),
    branch: z.string().min(1, "Branch is required"),
    salesman: z.string().min(1, "Salesman is required"),
    
    items: z.array(getPurchaseInvoiceItemSchema(decimalPart)),
    payments: z.array(getPurchaseInvoicePaymentSchema(decimalPart)),
    
    globalDiscPercent: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    discAmount: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    narration: z.string().max(200, "Max 200 characters").optional(),
    otherCharge: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
    roundOff: z.string().regex(posAmountRegex, "Invalid amount").refine(val => Number(val) >= 0, "Cannot be negative").default("0"),
  });
};

export type PurchaseInvoiceLineItem = z.infer<ReturnType<typeof getPurchaseInvoiceItemSchema>>;
export type PurchasePaymentLine = z.infer<ReturnType<typeof getPurchaseInvoicePaymentSchema>>;
export type PurchaseInvoiceForm = z.infer<ReturnType<typeof getPurchaseInvoiceSchema>>;
