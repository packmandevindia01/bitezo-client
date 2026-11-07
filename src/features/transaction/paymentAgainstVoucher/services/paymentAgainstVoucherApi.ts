import { createAgainstVoucherApi } from "../../shared/againstVoucherApi";

export { formatDateOnly } from "../../shared/purchaseDocument";

const api = createAgainstVoucherApi("payment", "SupplierId");
export const paymentAgainstVoucherApi = {
  ...api,
  getPaymentAgainstVoucherList: api.getList,
  getPaymentAgainstVoucherById: api.getById,
  createPaymentAgainstVoucher: api.create,
  updatePaymentAgainstVoucher: api.update,
  cancelPaymentAgainstVoucher: api.cancel,
};
