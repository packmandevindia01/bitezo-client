import type { RecipeForm } from "./types";

export const createEmptyRecipeForm = (): RecipeForm => ({
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductQty: "1",
  
  product: "",
  code: "",
  unit: "",
  qty: "0",
  cost: "0.000",
  
  otherCharge: "0.000",
});
