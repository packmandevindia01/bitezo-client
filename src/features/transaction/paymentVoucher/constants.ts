import type { PaymentVoucherForm } from "./types";

export const createEmptyPaymentVoucherForm = (): PaymentVoucherForm => ({
  series: "",
  vchNo: "",
  account: "",
  amount: "0.000",
  paymode: "",
  narration: "",
});
