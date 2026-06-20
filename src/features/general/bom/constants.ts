import type { BomForm } from "./types";

export const createEmptyBomForm = (): BomForm => ({
  bomName: "",
  branchId: "",

  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "1",
  
  product: "",
  code: "",
  unit: "",
  unitName: "",
  qty: "0",
});
