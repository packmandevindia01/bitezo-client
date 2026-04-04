export interface VoucherSeriesForm {
  voucherType: string;
  name: string;
  prefix: string;
  startNo: string;
  branch: string;
}

export interface VoucherSeriesRecord extends VoucherSeriesForm {
  id: number;
}
