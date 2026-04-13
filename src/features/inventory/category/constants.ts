import type { CategoryRecord } from "./types/types";

export const initialCategories: CategoryRecord[] = [
  {
    id: 1,
    code: "CAT-001",
    name: "Beverages",
    image: "",
    branches: ["Main Branch", "Express Counter"],
  },
  {
    id: 2,
    code: "CAT-002",
    name: "Snacks",
    image: "",
    branches: ["Main Branch"],
  },
];

export const emptyCategoryForm = {
  code: "",
  name: "",
  image: "",
};

export const categoryBranchOptions = ["Main Branch", "Express Counter", "Airport Outlet"];
