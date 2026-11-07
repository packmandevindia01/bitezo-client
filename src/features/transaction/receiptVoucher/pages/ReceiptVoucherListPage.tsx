import { VoucherListPage } from "../../shared/components/VoucherListPage";
import { VOUCHER_CONFIG } from "../hooks/useReceiptVoucher";

const ReceiptVoucherListPage = () => (
  <VoucherListPage config={VOUCHER_CONFIG} route="/dashboard/receipt-voucher" idPrefix="rv" amountClass="text-emerald-600" />
);

export default ReceiptVoucherListPage;
