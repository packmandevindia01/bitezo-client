import { useVoucherForm, type VoucherConfig } from "../../shared/useVoucherForm";
import { subscribeToSupplierUpdates } from "../../../general/supplier/utils/supplierSync";
import { paymentVoucherApi } from "../services/paymentVoucherApi";
import { paymentVoucherSchema } from "../types";

export { formatDateOnly } from "../services/paymentVoucherApi";

export const VOUCHER_CONFIG: VoucherConfig = {
  label: "Payment", keyPrefix: "payment", api: paymentVoucherApi, schema: paymentVoucherSchema,
  validateWhileTyping: true, subscribeToAccountUpdates: subscribeToSupplierUpdates,
};

export const usePaymentVoucher = (transId?: number, onSuccessCallback?: () => void) => {
  const { vouchers, ...rest } = useVoucherForm(VOUCHER_CONFIG, transId, onSuccessCallback);
  return { ...rest, paymentVouchers: vouchers };
};
