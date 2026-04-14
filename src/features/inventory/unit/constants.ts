import type { UnitFormState } from "./types";

export const unitCategoryOptions = [
  { label: "Quantity", value: "Quantity" },
  { label: "Weight", value: "Weight" },
  { label: "Volume", value: "Volume" },
];

export const emptyUnitForm: UnitFormState = {
  name: "",
  category: "Quantity",
  conversion: 1,
  currentValue: 0,
  parentId: 0,
};
