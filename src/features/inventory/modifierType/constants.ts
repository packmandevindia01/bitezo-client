import type { ModifierTypeForm, ModifierTypeRecord } from "./types";

export const emptyModifierTypeForm: ModifierTypeForm = {
  name: "",
  arabicName: "",
};

export const initialModifierTypes: ModifierTypeRecord[] = [
  { typeId: 1, name: "Required", arabicName: "Required" },
  { typeId: 2, name: "Optional", arabicName: "Optional" },
];
