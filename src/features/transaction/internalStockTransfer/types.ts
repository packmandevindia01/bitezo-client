import { z } from "zod";

export const InternalStockTransferItemSchema = z.object({
  id: z.string(), // uuid
  productId: z.number().optional(),
  product: z.string().min(1, "Product is required"), // matches combobox
  productName: z.string().optional(), // stored label for display
  code: z.string(),
  unitId: z.number().optional(),
  unit: z.string(),
  unitCategory: z.string().optional(),
  stock: z.string().optional(),
  qty: z.string().min(1, "Qty is required"),
  cost: z.string(),
});

export type InternalStockTransferLineItem = z.infer<typeof InternalStockTransferItemSchema>;

export const InternalStockTransferFormSchema = z.object({
  refNo: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  fromBranch: z.string().min(1, "From Branch is required"),
  toBranch: z.string().min(1, "To Branch is required"),
  salesman: z.string().optional(),
  items: z.array(InternalStockTransferItemSchema),
});

export type InternalStockTransferForm = z.infer<typeof InternalStockTransferFormSchema>;

export interface InternalStockTransferPayload {
  transDate: string;
  fromBranchId: number;
  toBranchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  createdAt: string;
  details: {
    productId: number;
    unitId: number;
    qty: number;
    price: number;
    amount: number;
    baseQty: number;
  }[];
}
