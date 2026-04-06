import type { ModifierForm, ModifierRecord } from "./types";

export const modifierCategoryOptions = [
  { label: "Food", value: "Food" },
  { label: "Beverage", value: "Beverage" },
  { label: "Dessert", value: "Dessert" },
];

export const modifierBranchOptions = [
  { label: "Main Branch", value: "Main Branch" },
  { label: "Airport Branch", value: "Airport Branch" },
  { label: "Mall Branch", value: "Mall Branch" },
];

export const emptyModifierForm: ModifierForm = {
  category: "",
  name: "",
  arabic: "",
  color: "",
  branch: "",
  isMultiCategory: false,
};

export const initialModifiers: ModifierRecord[] = [
  {
    id: 1,
    category: "Food",
    name: "Cheese Add-on",
    arabic: "اضافة جبن",
    color: "Yellow",
    branch: "Main Branch",
    isMultiCategory: true,
  },
  {
    id: 2,
    category: "Beverage",
    name: "Extra Ice",
    arabic: "ثلج إضافي",
    color: "Blue",
    branch: "Mall Branch",
    isMultiCategory: false,
  },
];
