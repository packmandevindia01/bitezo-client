import type { SectionForm, SectionRecord } from "./types";

export const initialSections: SectionRecord[] = [
  { id: 1, name: "Family", counter: "Counter 1" },
  { id: 2, name: "Outdoor", counter: "Counter 1" },
  { id: 3, name: "VIP", counter: "Counter 2" },
];

export const emptySectionForm: SectionForm = {
  name: "",
  counter: "",
};
