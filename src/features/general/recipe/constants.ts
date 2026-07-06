import type { RecipeForm } from "./types";
import { generateUUID } from "../../../utils/uuid";

export const createEmptyRecipeForm = (): RecipeForm => ({
  branchId: "",
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "1",
  items: [{ id: generateUUID(), product: "", qty: "1", cost: "0" }],
});
