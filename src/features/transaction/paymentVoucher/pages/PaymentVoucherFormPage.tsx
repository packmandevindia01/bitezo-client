import { useParams, useNavigate } from "react-router-dom";
import { usePaymentVoucher } from "../hooks/usePaymentVoucher";
import { VoucherFormPage } from "../../shared/voucherForm/VoucherFormPage";

/** Payment Voucher form: the shared voucher form page (shared/voucherForm). */
const PaymentVoucherFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const doc = usePaymentVoucher(Number(id) || undefined, () => navigate("/dashboard/payment-voucher"));
  return <VoucherFormPage kind="payment" id={id} doc={doc} />;
};

export default PaymentVoucherFormPage;
