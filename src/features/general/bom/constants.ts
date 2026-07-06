import type { BomForm } from "./types";
import { generateUUID } from "../../../utils/uuid";

export const createEmptyBomForm = (): BomForm => ({
  bomName: "",
  branchId: "",
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "1",
  items: [{ id: generateUUID(), product: "", qty: "1" }],
});
