import type { BomForm } from "./types";

export const createEmptyBomForm = (): BomForm => ({
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductQty: "1",
  
  product: "",
  code: "",
  unit: "",
  qty: "0",
});
