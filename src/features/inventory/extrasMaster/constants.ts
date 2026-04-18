import type { ExtrasMasterForm, ExtrasMasterRecord } from "./types";

export const extrasCategoryOptions = [
  { label: "Food", value: "Food" },
  { label: "Beverages", value: "Beverages" },
  { label: "Desserts", value: "Desserts" },
];

export const extrasTypeOptions = [
  { label: "Add-on", value: "Add-on" },
  { label: "Optional", value: "Optional" },
  { label: "Required", value: "Required" },
];

export const extrasBranchOptions = [
  { label: "Main Branch", value: "Main Branch" },
  { label: "Airport Branch", value: "Airport Branch" },
  { label: "City Center Branch", value: "City Center Branch" },
];

export const emptyExtrasMasterForm: ExtrasMasterForm = {
  category: "",
  name: "",
  arabic: "",
  price: "0.000",
  typeId: "",
  color: "#8fce63",
  branchIds: [],
  categoryIds: [],
};

export const initialExtrasMaster: ExtrasMasterRecord[] = [
  {
    id: 1,
    sNo: 1,
    name: "Extra Cheese",
    arabic: "Extra Cheese",
    price: 1.500,
    typeId: 1,
    color: "#f5b342",
    branchIds: [1],
    categoryIds: [1],
  },
  {
    id: 2,
    sNo: 2,
    name: "Extra Ice",
    arabic: "Extra Ice",
    price: 0.250,
    typeId: 2,
    color: "#62c8f2",
    branchIds: [1],
    categoryIds: [2],
  },
];
