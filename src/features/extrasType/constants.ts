import type { ExtrasTypeForm, ExtrasTypeRecord } from "./types";

export const emptyExtrasTypeForm: ExtrasTypeForm = {
  name: "",
  arabic: "",
};

export const initialExtrasTypes: ExtrasTypeRecord[] = [
  { id: 1, name: "Add-on", arabic: "Add-on" },
  { id: 2, name: "Optional", arabic: "Optional" },
];
