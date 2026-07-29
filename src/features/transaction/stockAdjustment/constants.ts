import type { StockAdjustmentForm } from "./types";

export const createEmptyStockAdjustmentForm = (): StockAdjustmentForm => ({
  series: "",
  refNo: "",
  date: new Date().toISOString().split("T")[0],
  branch: "",
  salesman: "",
  narration: "",
  items: [],
});
