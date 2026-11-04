import type {
  ProductTransactionLogRecord,
  ProductTransactionLogResponse,
  ProductTransactionLogTotals,
} from "../types";

/**
 * GET /reports/product-transaction-log → { logData[], totalData }.
 * Accepts the response with or without the `{ isSuccess, data }` wrapper, PascalCase keys (LogData /
 * TotalData / QtyIn …), `null` lists and numeric values, so a valid answer is never shown as "no data".
 */
type Raw = Record<string, unknown> | null | undefined;

const pick = (obj: Raw, ...keys: string[]): unknown => {
  if (!obj) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
};

const text = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

export const EMPTY_TOTALS: ProductTransactionLogTotals = { opening: "-", received: "-", issued: "-", balance: "-" };

const normalizeRow = (r: Raw, idx: number): ProductTransactionLogRecord => ({
  sNo: Number(pick(r, "sNo", "SNo", "sno", "slNo")) || idx + 1,
  branch: text(pick(r, "branch", "Branch", "branchName", "BranchName")),
  date: text(pick(r, "date", "Date", "transDate", "TransDate", "voucherDate", "VoucherDate")) || undefined,
  transaction: text(pick(r, "transaction", "Transaction", "transactionType", "TransactionType")),
  voucherNo: text(pick(r, "voucherNo", "VoucherNo")),
  account: text(pick(r, "account", "Account", "accountName", "AccountName")),
  qtyIn: text(pick(r, "qtyIn", "QtyIn")),
  qtyOut: text(pick(r, "qtyOut", "QtyOut")),
  balance: text(pick(r, "balance", "Balance")),
});

export const normalizeTransactionLog = (raw: unknown): ProductTransactionLogResponse | null => {
  if (!raw || typeof raw !== "object") return null;
  let body = raw as Raw;
  // still wrapped ({ isSuccess, data: {...} })
  const inner = pick(body, "data", "Data");
  if (inner && typeof inner === "object" && !Array.isArray(inner)) body = inner as Raw;

  const rows = pick(body, "logData", "LogData");
  const totals = pick(body, "totalData", "TotalData") as Raw;

  return {
    logData: Array.isArray(rows) ? rows.map((r, i) => normalizeRow(r as Raw, i)) : [],
    totalData: totals
      ? {
          opening: text(pick(totals, "opening", "Opening")) || "-",
          received: text(pick(totals, "received", "Received")) || "-",
          issued: text(pick(totals, "issued", "Issued")) || "-",
          balance: text(pick(totals, "balance", "Balance")) || "-",
        }
      : EMPTY_TOTALS,
  };
};

/**
 * True when a quantity is non-zero. The backend sends plain numbers ("10.000") or text with units
 * ("0 Kg 100 Gm", "3 Nos", "1 Box 2 Pcs"): any non-zero number inside counts ("0 Kg 0 Gm", "0.000", "-", "" are empty).
 */
export const hasQty = (v: string | number | undefined | null): boolean =>
  (String(v ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/g) || []).some((n) => Number(n) !== 0);

/** yyyy-MM-dd in the user's LOCAL date (toISOString() gives the UTC date — the day before, early morning in GCC / India). */
export const localDateString = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const firstOfMonthLocal = (d: Date = new Date()): string => localDateString(new Date(d.getFullYear(), d.getMonth(), 1));
