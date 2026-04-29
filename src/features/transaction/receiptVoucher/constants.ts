import type { ReceiptVoucherForm } from "./types";

export const createEmptyReceiptVoucherForm = (): ReceiptVoucherForm => ({
  series: "",
  vchNo: "",
  account: "",
  amount: "0.000",
  paymode: "",
  narration: "",
});
