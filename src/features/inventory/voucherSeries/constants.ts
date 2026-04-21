import type { VoucherSeriesForm } from "./types";

export const voucherTypeOptions = [
  { label: "Sale", value: "Sale" },
  { label: "Sales Return", value: "Sales Return" },
  { label: "Purchase", value: "Purchase" },
  { label: "Purchase Return", value: "Purchase Return" },
  { label: "Receipt", value: "Receipt" },
  { label: "Payment", value: "Payment" },
];

export const emptyVoucherSeriesForm: VoucherSeriesForm = {
  voucherType: "",
  name: "",
  prefix: "",
  startNo: "1",
  branchId: "",
};
