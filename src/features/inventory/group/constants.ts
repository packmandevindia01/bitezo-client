import type { GroupForm, GroupRecord } from "./types";

export const emptyGroupForm: GroupForm = {
  code: "",
  name: "",
};

export const initialGroups: GroupRecord[] = [
  {
    id: 1,
    code: "GRP-001",
    name: "Beverages",
  },
  {
    id: 2,
    code: "GRP-002",
    name: "Groceries",
  },
];
