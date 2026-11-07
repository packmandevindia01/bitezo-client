import { useAgainstVoucherList } from "../../shared/useAgainstVoucherList";
import { paymentAgainstVoucherApi, formatDateOnly } from "../services/paymentAgainstVoucherApi";

export { formatDateOnly };

export const usePaymentAgainstVoucherList = (fromDate?: string, toDate?: string) => useAgainstVoucherList("payment", paymentAgainstVoucherApi, fromDate, toDate);
