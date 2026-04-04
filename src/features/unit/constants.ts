import type { UnitForm, UnitRecord } from "./types";

export const unitCategoryOptions = [
  { label: "Inventory", value: "Inventory" },
  { label: "Sales", value: "Sales" },
  { label: "Purchase", value: "Purchase" },
];

export const initialParentUnitOptions = [
  { label: "Piece", value: "Piece" },
  { label: "Box", value: "Box" },
  { label: "Packet", value: "Packet" },
];

export const emptyUnitForm: UnitForm = {
  category: "",
  name: "",
  parentUnit: "",
  conversion: "",
};

export const initialUnits: UnitRecord[] = [
  {
    id: 1,
    category: "Inventory",
    name: "Carton",
    parentUnit: "Box",
    conversion: "12",
  },
  {
    id: 2,
    category: "Sales",
    name: "Bundle",
    parentUnit: "Piece",
    conversion: "6",
  },
];
