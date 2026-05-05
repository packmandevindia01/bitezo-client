import type { PaymentVoucherForm } from "./types";

export const createEmptyPaymentVoucherForm = (): PaymentVoucherForm => ({
  series: "",
  vchNo: "",
  account: "",
  amount: "",
  paymode: "",
  narration: "",
});
