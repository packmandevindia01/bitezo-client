import { createAgainstVoucherApi } from "../../shared/againstVoucherApi";

export { formatDateOnly } from "../../shared/purchaseDocument";

const api = createAgainstVoucherApi("receipt", "CustomerId");
export const receiptAgainstVoucherApi = {
  ...api,
  getReceiptAgainstVoucherList: api.getList,
  getReceiptAgainstVoucherById: api.getById,
  createReceiptAgainstVoucher: api.create,
  updateReceiptAgainstVoucher: api.update,
  deleteReceiptAgainstVoucher: api.cancel,
};
