// ── API Query Params ──────────────────────────────────────────────────────────
export interface ProductTransactionLogParams {
  BranchId: number;
  ProductId: number;
  FromDate: string;
  ToDate: string;
}

// ── Log Row (matches API logData[]) ──────────────────────────────────────────
export interface ProductTransactionLogRecord {
  sNo: number;
  branch: string;
  transaction: string;
  voucherNo: string;
  account: string;
  qtyIn: string;
  qtyOut: string;
  balance: string;
}

// ── Total Summary (matches API totalData) ────────────────────────────────────
export interface ProductTransactionLogTotals {
  opening: string;
  received: string;
  issued: string;
  balance: string;
}

// ── Full API Response shape ───────────────────────────────────────────────────
export interface ProductTransactionLogResponse {
  logData: ProductTransactionLogRecord[];
  totalData: ProductTransactionLogTotals;
}

// ── Master data types ─────────────────────────────────────────────────────────
export interface BranchOption {
  branchId: number;
  branchName: string;
}

export interface ProductOption {
  productId: number;
  productName: string;
  code: string;
  barcode: string;
}
