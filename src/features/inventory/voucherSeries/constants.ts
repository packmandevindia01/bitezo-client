import type { VoucherSeriesForm, VoucherSeriesRecord } from "./types";

export const voucherTypeOptions = [
  { label: "Sales Voucher", value: "Sales Voucher" },
  { label: "Return Voucher", value: "Return Voucher" },
  { label: "Kitchen Voucher", value: "Kitchen Voucher" },
];

export const voucherBranchOptions = [
  { label: "Main Branch", value: "Main Branch" },
  { label: "Airport Branch", value: "Airport Branch" },
  { label: "City Center Branch", value: "City Center Branch" },
];

export const emptyVoucherSeriesForm: VoucherSeriesForm = {
  voucherType: "",
  name: "",
  prefix: "",
  startNo: "1",
  branch: "",
};

export const initialVoucherSeries: VoucherSeriesRecord[] = [
  {
    id: 1,
    voucherType: "Sales Voucher",
    name: "Counter Billing",
    prefix: "SAL",
    startNo: "1",
    branch: "Main Branch",
  },
  {
    id: 2,
    voucherType: "Kitchen Voucher",
    name: "Kitchen Print",
    prefix: "KIT",
    startNo: "100",
    branch: "Airport Branch",
  },
];
