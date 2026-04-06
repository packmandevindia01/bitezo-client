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
  type: "",
  color: "#8fce63",
  branch: "",
  isMultiCategory: false,
};

export const initialExtrasMaster: ExtrasMasterRecord[] = [
  {
    id: 1,
    category: "Food",
    name: "Extra Cheese",
    arabic: "Extra Cheese",
    price: "1.500",
    type: "Add-on",
    color: "#f5b342",
    branch: "Main Branch",
    isMultiCategory: true,
  },
  {
    id: 2,
    category: "Beverages",
    name: "Extra Ice",
    arabic: "Extra Ice",
    price: "0.250",
    type: "Optional",
    color: "#62c8f2",
    branch: "Airport Branch",
    isMultiCategory: false,
  },
];
