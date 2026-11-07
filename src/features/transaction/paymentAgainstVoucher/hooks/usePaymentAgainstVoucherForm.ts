import { useAgainstVoucherForm, type AgainstVoucherConfig } from "../../shared/useAgainstVoucherForm";
import { subscribeToSupplierUpdates } from "../../../general/supplier/utils/supplierSync";
import { paymentAgainstVoucherSchema } from "../schema/paymentAgainstVoucherSchema";
import { paymentAgainstVoucherApi, formatDateOnly } from "../services/paymentAgainstVoucherApi";

export { formatDateOnly };

const CONFIG: AgainstVoucherConfig = { keyPrefix: "payment", api: paymentAgainstVoucherApi, schema: paymentAgainstVoucherSchema, subscribeToAccountUpdates: subscribeToSupplierUpdates };

export const usePaymentAgainstVoucherForm = (transId?: number, onSuccess?: () => void) => useAgainstVoucherForm(CONFIG, transId, onSuccess);
