import type { PhysicalEntryForm } from "./types";
import { formatDateOnly } from "./services/physicalEntryApi";

export const createEmptyPhysicalEntryForm = (): PhysicalEntryForm => ({
  refNo: "",
  date: formatDateOnly(new Date()),
  branch: "",
  salesman: "",
  narration: "",
  items: [],
});
