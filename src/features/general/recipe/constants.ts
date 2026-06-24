import type { RecipeForm } from "./types";

export const createEmptyRecipeForm = (): RecipeForm => ({
  branchId: "",
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "1",

  rawMaterial: "",
  code: "",
  unit: "",
  qty: "0",
  cost: "0",
  items: [],
});
