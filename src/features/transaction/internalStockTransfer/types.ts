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
  date: z.string().min(1, "Date is required").refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return selectedDate <= today;
  }, { message: "Future dates are not allowed" }),
  fromBranch: z.string().min(1, "From Branch is required"),
  toBranch: z.string().min(1, "To Branch is required"),
  salesman: z.string().min(1, "Salesman is required"),
  narration: z.string().max(200, "Max 200 characters").optional(),
  items: z.array(InternalStockTransferItemSchema),
});

export type InternalStockTransferForm = z.infer<typeof InternalStockTransferFormSchema>;

export interface StockTransferDetailItem {
  productId: number;
  unitId: number;
  qty: number;
  price: number;
  amount: number;
  baseQty: number;
}

export interface InternalStockTransferCreatePayload {
  transDate: string;
  fromBranchId: number;
  toBranchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  createdAt: string;
  details: StockTransferDetailItem[];
}

export interface InternalStockTransferUpdatePayload {
  transId: number;
  transDate: string;
  fromBranchId: number;
  toBranchId: number;
  employeeId: number;
  netAmount: number;
  narration: string;
  updatedAt: string;
  details: StockTransferDetailItem[];
}

export type InternalStockTransferPayload = InternalStockTransferCreatePayload & {
  transId?: number;
  updatedAt?: string;
};

export interface StockTransferListParams {
  FromBranchId?: number;
  ToBranchId?: number;
  FromDate?: string;
  ToDate?: string;
  RefNo?: string;
  Decimals: number;
}
