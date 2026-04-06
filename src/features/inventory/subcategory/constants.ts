import type { SubCategoryRecord } from "./types";

export const subCategoryOptions = [
  { label: "Beverages", value: "CAT-001" },
  { label: "Snacks", value: "CAT-002" },
  { label: "Bakery", value: "CAT-003" },
];

export const initialSubCategories: SubCategoryRecord[] = [
  {
    id: 1,
    code: "SUB-001",
    name: "Cold Coffee",
    categoryId: "CAT-001",
    categoryName: "Beverages",
    image: "",
  },
  {
    id: 2,
    code: "SUB-002",
    name: "Fried Snacks",
    categoryId: "CAT-002",
    categoryName: "Snacks",
    image: "",
  },
];

export const emptySubCategoryForm = {
  code: "",
  name: "",
  categoryId: "",
  image: "",
};
