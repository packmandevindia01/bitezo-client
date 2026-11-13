import { useParams } from "react-router-dom";
import { usePaymentAgainstVoucherForm } from "../hooks/usePaymentAgainstVoucherForm";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { AgainstVoucherPage } from "../../shared/voucherForm/AgainstVoucherPage";

/** Payment Against Voucher: the shared against-voucher page (shared/voucherForm). */
const PaymentAgainstVoucherPage = () => {
  const { id } = useParams<{ id: string }>();
  const transId = id ? parseInt(id, 10) : undefined;
  const doc = usePaymentAgainstVoucherForm(transId);
  return <AgainstVoucherPage kind="payment" transId={transId} doc={doc} api={paymentAgainstVoucherApi} />;
};

export default PaymentAgainstVoucherPage;
