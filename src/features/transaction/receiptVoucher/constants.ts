import type { ReceiptVoucherForm } from "./types";

export const createEmptyReceiptVoucherForm = (): ReceiptVoucherForm => ({
  series: "",
  vchNo: "",
  account: "",
  amount: "",
  paymode: "",
  narration: "",
});
