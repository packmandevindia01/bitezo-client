import type { ReceiptAgainstVoucherForm } from "./types";

/**
 * Creates an empty form state for Receipt Against Voucher.
 * Note: Numeric strings should be initialized as "0" so formatters can handle them.
 */
export const createEmptyReceiptAgainstVoucherForm = (): ReceiptAgainstVoucherForm => ({
  series: "",
  vchNo: "",
  date: new Date().toISOString().split("T")[0],
  customer: "",
  vchType: "",
  vchNoInput: "",
  invAmnt: "0",
  paid: "0",
  balance: "0",
  amount: "0",
  narration: "",
  paymode: "",
});
