import type { PaymentAgainstVoucherForm } from "./types";

/**
 * Creates an empty form state for Payment Against Voucher.
 * Note: Numeric strings should be initialized as "0" so formatters can handle them.
 */
export const createEmptyPaymentAgainstVoucherForm = (): PaymentAgainstVoucherForm => ({
  series: "",
  vchNo: "",
  date: new Date().toISOString().split("T")[0],
  supplier: "",
  vchType: "",
  vchNoInput: "",
  invAmnt: "0",
  paid: "0",
  balance: "0",
  amount: "0",
  narration: "",
  paymode: "",
});
