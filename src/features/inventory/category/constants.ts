import type { CategoryListItem } from "./types";

export const initialCategories: CategoryListItem[] = [
  {
    id: 1,
    code: "CAT-001",
    name: "Beverages",
    arabic: "مشروبات",
    isActive: true,
    branches: [
      { id: 1, name: "Main Branch" },
      { id: 2, name: "Express Counter" }
    ],
  },
  {
    id: 2,
    code: "CAT-002",
    name: "Snacks",
    arabic: "وجبات خفيفة",
    isActive: true,
    branches: [{ id: 1, name: "Main Branch" }],
  },
];


export const emptyCategoryForm = {
  code: "",
  name: "",
  image: "",
};

export const categoryBranchOptions = ["Main Branch", "Express Counter", "Airport Outlet"];
