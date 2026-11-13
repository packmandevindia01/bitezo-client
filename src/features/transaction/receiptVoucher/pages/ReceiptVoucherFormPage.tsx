import { useParams, useNavigate } from "react-router-dom";
import { useReceiptVoucher } from "../hooks/useReceiptVoucher";
import { VoucherFormPage } from "../../shared/voucherForm/VoucherFormPage";

/** Receipt Voucher form: the shared voucher form page (shared/voucherForm). */
const ReceiptVoucherFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const doc = useReceiptVoucher(Number(id) || undefined, () => navigate("/dashboard/receipt-voucher"));
  return <VoucherFormPage kind="receipt" id={id} doc={doc} />;
};

export default ReceiptVoucherFormPage;
