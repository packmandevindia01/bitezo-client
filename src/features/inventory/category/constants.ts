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
    colorCode: "#ef4444",
  },
  {
    id: 2,
    code: "CAT-002",
    name: "Snacks",
    arabic: "وجبات خفيفة",
    isActive: true,
    branches: [{ id: 1, name: "Main Branch" }],
    colorCode: "#3b82f6",
  },
];


export const emptyCategoryForm = {
  code: "",
  name: "",
  image: "",
};

export const PRESET_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0ea5e9", // Sky
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#64748b", // Slate
];
