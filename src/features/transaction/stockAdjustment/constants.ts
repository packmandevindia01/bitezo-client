import type { StockAdjustmentForm } from "./types";

import { toLocalDateString } from "../../../utils/date";
export const createEmptyStockAdjustmentForm = (): StockAdjustmentForm => ({
  series: "",
  refNo: "",
  date: toLocalDateString(),
  branch: "",
  salesman: "",
  narration: "",
  items: [],
});
