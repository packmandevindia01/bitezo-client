import { createVoucherSchema } from "../shared/voucherTypes";
import type { VoucherAccount, VoucherCreatePayload, VoucherDataResponse, VoucherForm, VoucherListDto, VoucherMasterData, VoucherUpdatePayload } from "../shared/voucherTypes";

export const paymentVoucherSchema = createVoucherSchema(15);

export type PaymentVoucherForm = VoucherForm;
export type PaymentVoucherCreatePayload = VoucherCreatePayload;
export type PaymentVoucherUpdatePayload = VoucherUpdatePayload;
export type PaymentVoucherPayload = VoucherCreatePayload | VoucherUpdatePayload;
export type PaymentMasterData = VoucherMasterData;
export type PaymentAccount = VoucherAccount;
export type PaymentListDto = VoucherListDto;
export type PaymentDataResponse = VoucherDataResponse;
