import { useVoucherForm, type VoucherConfig } from "../../shared/useVoucherForm";
import { receiptVoucherApi } from "../services/receiptVoucherApi";
import { receiptVoucherSchema } from "../types";

export { formatDateOnly } from "../services/receiptVoucherApi";

export const VOUCHER_CONFIG: VoucherConfig = { label: "Receipt", keyPrefix: "receipt", api: receiptVoucherApi, schema: receiptVoucherSchema };

export const useReceiptVoucher = (transId?: number, onSuccessCallback?: () => void) => {
  const { vouchers, ...rest } = useVoucherForm(VOUCHER_CONFIG, transId, onSuccessCallback);
  return { ...rest, receiptVouchers: vouchers };
};
