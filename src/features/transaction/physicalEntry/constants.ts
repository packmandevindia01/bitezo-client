import type { PhysicalEntryForm } from "./types";

export const createEmptyPhysicalEntryForm = (): PhysicalEntryForm => ({
  refNo: "",
  date: new Date().toISOString().split("T")[0],
  branch: "",
  salesman: "",
  narration: "",
  items: [],
});
