import { VoucherListPage } from "../../shared/components/VoucherListPage";
import { VOUCHER_CONFIG } from "../hooks/usePaymentVoucher";

const PaymentVoucherListPage = () => (
  <VoucherListPage config={VOUCHER_CONFIG} route="/dashboard/payment-voucher" idPrefix="pv" amountClass="text-red-500" />
);

export default PaymentVoucherListPage;
