import type { RecipeForm } from "./types";

export const createEmptyRecipeForm = (): RecipeForm => ({
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductQty: "1",
  branch: "",

  rawMaterial: "",
  code: "",
  unit: "",
  qty: "0",
  cost: "0",
});
