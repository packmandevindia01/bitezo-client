import type { PaymodeForm } from "./types";

export const initialPaymodes: any[] = [];

export const createEmptyPaymodeForm = (): PaymodeForm => ({
  paymodeId: 0,
  code: "",
  paymodeName: "",
  isActive: true,
  counterIds: [],
});


