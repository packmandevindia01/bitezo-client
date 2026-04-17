import type { ModifierForm, ModifierRecord } from "./types";

export const emptyModifierForm: ModifierForm = {
  name: "",
  arabic: "",
  color: "#cccccc",
  typeId: "",
  price: "0",
  branchIds: [],
  categoryIds: [],
  category: "",
};

export const initialModifiers: ModifierRecord[] = [];
