import type { ProductionForm } from "./types";
import { generateUUID } from "../../../utils/uuid";

export const createEmptyProductionForm = (): ProductionForm => ({
  branchId: "",
  employeeId: "",
  productionNo: "",
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "1",
  otherCharge: "0",
  narration: "",
  items: [{ id: generateUUID(), product: "", qty: "1", cost: "0" }],
});
