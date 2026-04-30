import type { ApiResponse } from "../../inventory/product/types";

export interface LockProductListItem {
  sNo: number;
  productName: string;
  lockUntil: string;
  productId: number;
  branchId: number;
}

export interface LockProductPayload {
  productId: number;
  lockUntil: string;
}

export type { ApiResponse };
