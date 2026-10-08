import type { ProductionForm } from "./types";
import { generateUUID } from "../../../utils/uuid";
import { formatDateOnly } from "./services/productionApi";

export const createEmptyProductionForm = (): ProductionForm => ({
  branchId: "",
  employeeId: "",
  productionNo: "",
  date: formatDateOnly(new Date()),
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "1",
  otherCharge: "0",
  narration: "",
  items: [{ id: generateUUID(), product: "", qty: "1", cost: "0" }],
});
