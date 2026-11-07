import { useAgainstVoucherList } from "../../shared/useAgainstVoucherList";
import { receiptAgainstVoucherApi, formatDateOnly } from "../services/receiptAgainstVoucherApi";

export { formatDateOnly };

export const useReceiptAgainstVoucherList = (fromDate?: string, toDate?: string) => useAgainstVoucherList("receipt", receiptAgainstVoucherApi, fromDate, toDate);
