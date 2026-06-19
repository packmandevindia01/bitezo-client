import type { BomForm } from "./types";

export const createEmptyBomForm = (): BomForm => ({
  bomName: "",
  branchId: "",
  transDate: new Date().toISOString().split("T")[0],
  refNo: "",

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
