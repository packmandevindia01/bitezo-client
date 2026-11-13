import { useParams } from "react-router-dom";
import { useReceiptAgainstVoucherForm } from "../hooks/useReceiptAgainstVoucherForm";
import { receiptAgainstVoucherApi } from "../services/receiptAgainstVoucherApi";
import { AgainstVoucherPage } from "../../shared/voucherForm/AgainstVoucherPage";

/** Receipt Against Voucher: the shared against-voucher page (shared/voucherForm). */
const ReceiptAgainstVoucherPage = () => {
  const { id } = useParams<{ id: string }>();
  const transId = id ? parseInt(id, 10) : undefined;
  const doc = useReceiptAgainstVoucherForm(transId);
  return <AgainstVoucherPage kind="receipt" transId={transId} doc={doc} api={receiptAgainstVoucherApi} />;
};

export default ReceiptAgainstVoucherPage;
