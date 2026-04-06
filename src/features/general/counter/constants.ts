import type { CounterForm, CounterRecord } from "./types";

export const initialCounters: CounterRecord[] = [
  { id: 1, name: "Counter 1", branch: "Main Branch" },
  { id: 2, name: "Counter 2", branch: "Main Branch" },
  { id: 3, name: "Takeaway Counter", branch: "City Branch" },
];

export const emptyCounterForm: CounterForm = {
  name: "",
  branch: "",
};
