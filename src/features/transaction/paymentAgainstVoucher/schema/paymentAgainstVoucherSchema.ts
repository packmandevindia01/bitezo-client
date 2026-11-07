import { createAgainstVoucherSchema, type AgainstVoucherFormData } from "../../shared/againstVoucherSchema";

export const paymentAgainstVoucherSchema = createAgainstVoucherSchema("Supplier", "pay");
export type PaymentAgainstVoucherFormData = AgainstVoucherFormData;
