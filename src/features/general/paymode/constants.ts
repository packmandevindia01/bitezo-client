import type { PaymodeForm, PaymodeRecord } from "./types";

export const initialPaymodes: PaymodeRecord[] = [
  { id: 1, paymode: "Cash", branch: "Main Branch", counter: "Counter 1" },
  { id: 2, paymode: "Card", branch: "Main Branch", counter: "Counter 2" },
  { id: 3, paymode: "UPI", branch: "City Branch", counter: "Counter 1" },
];

export const createEmptyPaymodeForm = (nextId: number): PaymodeForm => ({
  id: String(nextId),
  paymode: "",
  branch: "",
  counter: "",
});
