import { createAgainstVoucherSchema, type AgainstVoucherFormData } from "../../shared/againstVoucherSchema";

export const receiptAgainstVoucherSchema = createAgainstVoucherSchema("Customer", "receive");
export type ReceiptAgainstVoucherFormData = AgainstVoucherFormData;
