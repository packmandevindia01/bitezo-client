import { useAgainstVoucherForm, type AgainstVoucherConfig } from "../../shared/useAgainstVoucherForm";
import { receiptAgainstVoucherSchema } from "../schema/receiptAgainstVoucherSchema";
import { receiptAgainstVoucherApi, formatDateOnly } from "../services/receiptAgainstVoucherApi";

export { formatDateOnly };

const CONFIG: AgainstVoucherConfig = { keyPrefix: "receipt", api: receiptAgainstVoucherApi, schema: receiptAgainstVoucherSchema };

export const useReceiptAgainstVoucherForm = (transId?: number, onSuccess?: () => void) => useAgainstVoucherForm(CONFIG, transId, onSuccess);
