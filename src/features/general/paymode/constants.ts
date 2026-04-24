import type { PaymodeForm, PaymodeRecord } from "./types";

export const initialPaymodes: PaymodeRecord[] = [];

export const createEmptyPaymodeForm = (): PaymodeForm => ({
  paymodeId: 0,
  code: "",
  paymodeName: "",
  isActive: true,
  counterIds: [],
});


