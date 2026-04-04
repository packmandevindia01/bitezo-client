import type { ModifierTypeForm, ModifierTypeRecord } from "./types";

export const emptyModifierTypeForm: ModifierTypeForm = {
  name: "",
  arabic: "",
};

export const initialModifierTypes: ModifierTypeRecord[] = [
  { id: 1, name: "Required", arabic: "Required" },
  { id: 2, name: "Optional", arabic: "Optional" },
];
