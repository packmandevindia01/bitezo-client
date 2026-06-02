import type { ModifierForm, ModifierRecord } from "./types";

export const emptyModifierForm: ModifierForm = {
  name: "",
  arabic: "",
  color: "#cccccc",

  branchIds: [],
  categoryIds: [],
  category: "",
};

export const initialModifiers: ModifierRecord[] = [];
