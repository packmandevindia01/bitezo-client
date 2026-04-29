import type { StockAdjustmentForm } from "./types";

export const createEmptyStockAdjustmentForm = (): StockAdjustmentForm => ({
  series: "",
  refNo: "",
  date: new Date().toISOString().split("T")[0],
  branch: "",
  salesman: "",
  
  product: "",
  code: "",
  unit: "",
  qty: "0",
  cost: "0",
  amount: "0",
  type: "",
  effect: "",
});
