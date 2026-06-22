import type { ProductionForm } from "./types";

export const createEmptyProductionForm = (): ProductionForm => ({
  branchId: "",
  employeeId: "",
  productionNo: "",
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductQty: "",
  items: [],
  narration: "",
  code: "",
  unit: "",
  qty: "0",
  cost: "0",
  
  otherCharge: "0",
});
