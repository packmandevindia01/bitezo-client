import { createVoucherSchema } from "../shared/voucherTypes";
import type { VoucherAccount, VoucherCreatePayload, VoucherDataResponse, VoucherForm, VoucherListDto, VoucherMasterData, VoucherUpdatePayload } from "../shared/voucherTypes";

export const receiptVoucherSchema = createVoucherSchema(12);

export type ReceiptVoucherForm = VoucherForm;
export type ReceiptVoucherCreatePayload = VoucherCreatePayload;
export type ReceiptVoucherUpdatePayload = VoucherUpdatePayload;
export type ReceiptVoucherPayload = VoucherCreatePayload | VoucherUpdatePayload;
export type ReceiptMasterData = VoucherMasterData;
export type ReceiptAccount = VoucherAccount;
export type ReceiptListDto = VoucherListDto;
export type ReceiptDataResponse = VoucherDataResponse;
