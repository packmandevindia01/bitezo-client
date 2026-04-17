import type { ExtrasTypeForm, ExtrasTypeRecord } from "./types";

export const emptyExtrasTypeForm: ExtrasTypeForm = {
  name: "",
  arabicName: "",
};

export const initialExtrasTypes: ExtrasTypeRecord[] = [
  { typeId: 1, name: "Add-on", arabicName: "Add-on" },
  { typeId: 2, name: "Optional", arabicName: "Optional" },
];
